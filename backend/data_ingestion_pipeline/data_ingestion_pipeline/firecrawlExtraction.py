# Install required packages:
# pip install pinecone-client sentence-transformers firecrawl-py

import asyncio
import json
import os
from datetime import datetime
from firecrawl import AsyncFirecrawlApp
from firecrawl import ScrapeOptions
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone, ServerlessSpec

# Custom JSON encoder to handle datetime and FirecrawlDocument objects
class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()  # Convert datetime to ISO 8601 string
        elif hasattr(obj, 'to_dict') and callable(obj.to_dict):
            return obj.to_dict()  # Convert FirecrawlDocument to dict
        elif hasattr(obj, '__dict__'):
            return obj.__dict__  # Fallback for other custom objects
        return super().default(obj)

# Set your Pinecone API key (replace with your actual key or use environment variable)
# if "PINECONE_API_KEY" not in os.environ:
#     raise ValueError("PINECONE_API_KEY environment variable not set. Please set it with a valid Pinecone API key.")
# Example: os.environ["PINECONE_API_KEY"] = "your-pinecone-api-key-here"

async def main():
    # Initialize Firecrawl
    app = AsyncFirecrawlApp(api_key='firecrawl-api-key')
    
    # Crawl the website
    response = await app.crawl_url(
        url='https://www.aven.com/',
        limit=100,
        allow_backward_links=True,
        scrape_options=ScrapeOptions(
            formats=['markdown', 'links', 'html'],
            onlyMainContent=True,
            parsePDF=True,
            maxAge=14400000
        )
    )
    
    # Convert response to a JSON-serializable dictionary
    try:
        # If response has a to_dict() method
        response_dict = response.to_dict() if hasattr(response, 'to_dict') else response.__dict__
        
        # Ensure 'data' field contains JSON-serializable dictionaries
        if 'data' in response_dict:
            response_dict['data'] = [
                doc.to_dict() if hasattr(doc, 'to_dict') else doc.__dict__
                for doc in response_dict.get('data', [])
            ]
    except AttributeError:
        # Manually construct response_dict if to_dict() is not available
        response_dict = {
            'data': [
                {
                    'markdown': doc.get('markdown', ''),
                    'html': doc.get('html', ''),
                    'links': doc.get('links', []),
                    'metadata': doc.get('metadata', {})
                } for doc in response.get('data', [])
            ],
            'links': response.get('links', []),
        }
    
    # Save the response to a file using the custom JSON encoder
    with open('firecrawl_output.json', 'w') as f:
        json.dump(response_dict, f, indent=2, cls=DateTimeEncoder)
    
    # Extract markdown content and metadata for embeddings
    documents = []
    metadata_list = []
    for i, doc in enumerate(response_dict.get('data', [])):
        if 'markdown' in doc and doc['markdown']:
            documents.append(doc['markdown'])
            # Store metadata (e.g., URL, ID) for each document
            metadata_list.append({
                'id': f"doc_{i}",
                'url': doc.get('metadata', {}).get('sourceURL', 'unknown'),
                'title': doc.get('metadata', {}).get('title', 'untitled')
            })
    
    # Check if markdown content is available
    if not documents:
        print("No markdown content found in the Firecrawl response.")
        return
    
    # Initialize Sentence Transformers model
    try:
        model = SentenceTransformer('sentence-transformers/all-mpnet-base-v2')  # 768 dimensions
    except Exception as e:
        print(f"Error initializing Sentence Transformers model: {e}")
        return
    
    # Generate embeddings
    try:
        embeddings = model.encode(documents, show_progress_bar=True)
        print(f"Generated embeddings for {len(documents)} document(s).")
        print(f"Embedding dimension: {len(embeddings[0])}")
        
        # Save embeddings to a file
        with open('embeddings.json', 'w') as f:
            json.dump(embeddings.tolist(), f, indent=2)  # Convert numpy array to list
        
        # Print the first few values of the first embedding
        print("Sample embedding (first 10 values):", embeddings[0][:10].tolist())
        
    except Exception as e:
        print(f"Error generating embeddings: {e}")
        return
    
    # Initialize Pinecone
    try:
        pc = Pinecone(api_key="pinecone-api-key")
        
        # Define index name and parameters
        index_name = "aven-embeddings"
        dimension = len(embeddings[0])  # 768 for all-mpnet-base-v2
        
        # Check if index exists; if it exists, verify dimension compatibility
        existing_indexes = pc.list_indexes().names()
        if index_name in existing_indexes:
            index_info = pc.describe_index(index_name)
            if index_info.dimension != dimension:
                print(f"Existing index '{index_name}' has dimension {index_info.dimension}, but model requires {dimension}. Deleting and recreating...")
                pc.delete_index(index_name)
                pc.create_index(
                    name=index_name,
                    dimension=dimension,
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-east-1")  # Adjust region as needed
                )
        else:
            print(f"Creating Pinecone index '{index_name}'...")
            pc.create_index(
                name=index_name,
                dimension=dimension,
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region="us-east-1")  # Adjust region as needed
            )
        
        # Connect to the index
        index = pc.Index(index_name)
        
        # Prepare data for upsert (vectors with IDs and metadata)
        vectors = [
            {
                "id": meta['id'],
                "values": embedding.tolist(),
                "metadata": {
                    "url": meta['url'],
                    "title": meta['title'],
                    "text": doc[:1000]  # Truncate text for metadata (Pinecone has size limits)
                }
            }
            for doc, meta, embedding in zip(documents, metadata_list, embeddings)
        ]
        
        # Upsert embeddings to Pinecone
        index.upsert(vectors=vectors)
        print(f"Successfully upserted {len(vectors)} vectors to Pinecone index '{index_name}'.")
        
    except Exception as e:
        print(f"Error with Pinecone operations: {e}")
        return

# Run the async main function
if __name__ == "__main__":
    asyncio.run(main())