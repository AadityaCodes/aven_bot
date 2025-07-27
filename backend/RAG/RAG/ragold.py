# import os
# import asyncio
# from sentence_transformers import SentenceTransformer
# from pinecone import Pinecone
# from google import genai
# from google.genai import types
# from flask import Flask, request, jsonify
# import threading
# from flask_cors import CORS
# from flask import Flask, request, jsonify
# import requests

# async def generate_response(prompt, retrieved_docs):
#     """
#     Generate a response using Gemini (gemini-2.0-flash) with retrieved documents as context.
#     """
#     try:
#         # Initialize Gemini client
#         client = genai.Client(api_key="AIzaSyCA7LChMskV1NZn2h3xku5RPYeyVqeSBjA")

#         # Combine retrieved documents into context
#         context = "\n".join([doc['metadata']['text'] for doc in retrieved_docs])
#         full_prompt = f"Context:\n{context}\n\nQuestion: {prompt}\nAnswer in a concise and clear manner:"

#         # Configure Gemini content
#         contents = [
#             types.Content(
#                 role="user",
#                 parts=[
#                     types.Part.from_text(text=full_prompt),
#                 ],
#             ),
#         ]
#         generate_content_config = types.GenerateContentConfig(
#             response_mime_type="text/plain",
#         )

#         # Generate response using Gemini
#         response = ""
#         for chunk in client.models.generate_content_stream(
#             model="gemini-2.0-flash",
#             contents=contents,
#             config=generate_content_config,
#         ):
#             response += chunk.text

#         return response.strip()

#     except Exception as e:
#         print(f"Error generating response with Gemini: {e}")
#         return "Error generating response"

# async def test_rag(prompt, top_k=3):
#     # Initialize Sentence Transformers model (same as used for indexing)
#     try:
#         model = SentenceTransformer('sentence-transformers/all-mpnet-base-v2')
#     except Exception as e:
#         print(f"Error initializing Sentence Transformers model: {e}")
#         return None

#     # Encode the user prompt
#     try:
#         query_embedding = model.encode(prompt, show_progress_bar=False).tolist()
#     except Exception as e:
#         print(f"Error encoding query: {e}")
#         return None

#     # Initialize Pinecone
#     try:
#         pc = Pinecone(api_key="pcsk_35ZMWD_5Q7dfwZD6UWx7UFfzvGY1dn7gDGxL5oQosr4Q3gxQ8YcdbWHjt6RCszMvusC9kh")
#         index_name = "aven-embeddings"
#         index = pc.Index(index_name)
#     except Exception as e:
#         print(f"Error connecting to Pinecone: {e}")
#         return None

#     # Query Pinecone for top-k similar documents
#     try:
#         query_results = index.query(
#             vector=query_embedding,
#             top_k=top_k,
#             include_metadata=True
#         )
#         retrieved_docs = query_results['matches']
#         print(f"Retrieved {len(retrieved_docs)} documents:")
#         for doc in retrieved_docs:
#             print(f"ID: {doc['id']}, Score: {doc['score']}, URL: {doc['metadata']['url']}, Title: {doc['metadata']['title']}")
#     except Exception as e:
#         print(f"Error querying Pinecone: {e}")
#         return None

#     # Generate response using Gemini
#     response = await generate_response(prompt, retrieved_docs)
#     return response

# app = Flask(__name__)
# CORS(app)

# @app.route('/rag', methods=['POST'])
# def rag_endpoint():
#     data = request.get_json()
#     prompt = data.get('prompt')
#     if not prompt:
#         return jsonify({'error': 'Missing prompt'}), 400
#     try:
#         # Run the async RAG pipeline in a thread-safe way
#         loop = asyncio.new_event_loop()
#         asyncio.set_event_loop(loop)
#         response = loop.run_until_complete(test_rag(prompt, top_k=3))
#         return jsonify({'response': response})
#     except Exception as e:
#         return jsonify({'error': str(e)}), 500


# if __name__ == "__main__":
#     app.run(debug=True)






# import os
# import asyncio
# import time
# import re
# import logging
# from sentence_transformers import SentenceTransformer
# from pinecone import Pinecone
# from google import genai
# from google.genai import types
# from flask import Flask, request, jsonify
# from flask_cors import CORS
# from upstash_redis import Redis
# from dotenv import load_dotenv

# # Load environment variables
# load_dotenv()

# # Configure logging
# logging.basicConfig(level=logging.DEBUG)
# logger = logging.getLogger(__name__)

# app = Flask(__name__)
# CORS(app)

# async def generate_response(prompt, retrieved_docs, tone='neutral'):
#     try:
#         api_key = os.environ.get('GOOGLE_API_KEY', 'AIzaSyCA7LChMskV1NZn2h3xku5RPYeyVqeSBjA')
#         if not api_key:
#             raise ValueError("GOOGLE_API_KEY is not set")
#         client = genai.Client(api_key=api_key)
#         context = "\n".join([doc['metadata']['text'] for doc in retrieved_docs])
#         system_prompt = (
#             "You are an empathetic Aven support agent named Aven. Acknowledge the user’s frustration and provide clear, supportive solutions."
#             if tone == 'empathetic'
#             else "You are a friendly Aven support agent named Aven."
#         )
#         full_prompt = f"{system_prompt}\n\nContext:\n{context}\n\nQuestion: {prompt}\nAnswer in a concise and clear manner:"
#         contents = [types.Content(role="user", parts=[types.Part.from_text(text=full_prompt)])]
#         generate_content_config = types.GenerateContentConfig(response_mime_type="text/plain")
#         response = ""
#         for chunk in client.models.generate_content_stream(
#             model="gemini-2.0-flash",
#             contents=contents,
#             config=generate_content_config,
#         ):
#             response += chunk.text
#         return response.strip()
#     except Exception as e:
#         logger.error(f"Error generating response with Gemini: {str(e)}")
#         return "Error generating response"

# async def test_rag(prompt, top_k=3, user_id='default-user', tone='neutral'):
#     sensitive_patterns = [
#         r'^\d{3}-\d{2}-\d{4}$',  # SSN
#         r'legal advice|lawyer|sue|court',  # Legal queries
#         r'fuck|shit|damn|bitch|stupid|idiot|dumb|dumbass',  # Toxic language
#     ]
#     if any(re.search(pattern, prompt, re.IGNORECASE) for pattern in sensitive_patterns):
#         return "I’m sorry, I can’t assist with that. Please contact Aven support directly at support@aven.com."

#     try:
#         model = SentenceTransformer('sentence-transformers/all-mpnet-base-v2')
#     except Exception as e:
#         logger.error(f"Error initializing Sentence Transformers model: {str(e)}")
#         return None
#     try:
#         query_embedding = model.encode(prompt, show_progress_bar=False).tolist()
#     except Exception as e:
#         logger.error(f"Error encoding query: {str(e)}")
#         return None
#     try:
#         api_key = os.environ.get('PINECONE_API_KEY', 'pcsk_35ZMWD_5Q7dfwZD6UWx7UFfzvGY1dn7gDGxL5oQosr4Q3gxQ8YcdbWHjt6RCszMvusC9kh')
#         if not api_key:
#             raise ValueError("PINECONE_API_KEY is not set")
#         pc = Pinecone(api_key=api_key)
#         index_name = "aven-embeddings"
#         index = pc.Index(index_name)
#     except Exception as e:
#         logger.error(f"Error connecting to Pinecone: {str(e)}")
#         return None
#     try:
#         query_results = index.query(vector=query_embedding, top_k=top_k, include_metadata=True)
#         retrieved_docs = query_results['matches']
#         logger.info(f"Retrieved {len(retrieved_docs)} documents:")
#         for doc in retrieved_docs:
#             logger.info(f"ID: {doc['id']}, Score: {doc['score']}, URL: {doc['metadata']['url']}, Title: {doc['metadata']['title']}")
#     except Exception as e:
#         logger.error(f"Error querying Pinecone: {str(e)}")
#         return None

#     try:
#         redis = Redis.from_env()
#         redis.ping()  # Test connection
#         history = redis.lrange(f'user:{user_id}:history', 0, 5)
#         history_context = '\n'.join([h.decode() for h in history]) if history else ''
#         response = await generate_response(f"{history_context}\n\n{prompt}" if history_context else prompt, retrieved_docs, tone)
#         redis.lpush(f'user:{user_id}:history', f"Q: {prompt}\nA: {response}")
#         redis.close()
#         return response
#     except Exception as e:
#         logger.warning(f"Redis connection failed: {str(e)}. Proceeding without history.")
#         response = await generate_response(prompt, retrieved_docs, tone)
#         return response

# @app.route('/rag', methods=['POST'])
# def rag_endpoint():
#     data = request.get_json()
#     prompt = data.get('prompt')
#     user_id = data.get('user_id', 'default-user')
#     tone = data.get('tone', 'neutral')
#     if not prompt:
#         return jsonify({'error': 'Missing prompt'}), 400
#     try:
#         response = asyncio.run(test_rag(prompt, top_k=3, user_id=user_id, tone=tone))
#         if response is None:
#             return jsonify({'error': 'Failed to generate response'}), 500
#         return jsonify({'response': response})
#     except Exception as e:
#         logger.error(f"Error in rag_endpoint: {str(e)}")
#         return jsonify({'error': str(e)}), 500

# @app.route('/feedback', methods=['POST'])
# def feedback_endpoint():
#     data = request.get_json()
#     prompt = data.get('prompt')
#     response = data.get('response')
#     feedback = data.get('feedback')
#     if feedback == 'positive':
#         try:
#             model = SentenceTransformer('sentence-transformers/all-mpnet-base-v2')
#             embedding = model.encode(response, show_progress_bar=False).tolist()
#             api_key = os.environ.get('PINECONE_API_KEY', 'pcsk_35ZMWD_5Q7dfwZD6UWx7UFfzvGY1dn7gDGxL5oQosr4Q3gxQ8YcdbWHjt6RCszMvusC9kh')
#             pc = Pinecone(api_key=api_key)
#             index = pc.Index('aven-embeddings')
#             index.upsert([{'id': f'doc-{int(time.time())}', 'values': embedding, 'metadata': {'text': response, 'approved': True}}])
#         except Exception as e:
#             logger.error(f"Error saving feedback: {str(e)}")
#     return jsonify({'status': 'Feedback recorded'})

# if __name__ == "__main__":
#     app.run(debug=True)

















import os
import asyncio
import time
import re
import logging
import requests
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone
from google import genai
from google.genai import types
from flask import Flask, request, jsonify
from flask_cors import CORS
from upstash_redis import Redis
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

async def generate_response(prompt, retrieved_docs, tone='neutral'):
    try:
        api_key = os.environ.get('GOOGLE_API_KEY', 'AIzaSyCA7LChMskV1NZn2h3xku5RPYeyVqeSBjA')
        if not api_key:
            raise ValueError("GOOGLE_API_KEY is not set")
        client = genai.Client(api_key=api_key)
        context = "\n".join([doc['metadata']['text'] for doc in retrieved_docs])
        system_prompt = (
            "You are an empathetic Aven support agent named Aven. Acknowledge the user’s frustration and provide clear, supportive solutions."
            if tone == 'empathetic'
            else "You are a friendly Aven support agent named Aven."
        )
        full_prompt = f"{system_prompt}\n\nContext:\n{context}\n\nQuestion: {prompt}\nAnswer in a concise and clear manner:"
        contents = [types.Content(role="user", parts=[types.Part.from_text(text=full_prompt)])]
        generate_content_config = types.GenerateContentConfig(response_mime_type="text/plain")
        response = ""
        for chunk in client.models.generate_content_stream(
            model="gemini-2.0-flash",
            contents=contents,
            config=generate_content_config,
        ):
            response += chunk.text
        return response.strip()
    except Exception as e:
        logger.error(f"Error generating response with Gemini: {str(e)}")
        return "Error generating response"

async def test_rag(prompt, top_k=3, user_id='default-user', tone='neutral'):
    sensitive_patterns = [
        r'^\d{3}-\d{2}-\d{4}$',  # SSN
        r'legal advice|lawyer|sue|court',  # Legal queries
        r'fuck|shit|damn|bitch|stupid|idiot|dumb|dumbass',  # Toxic language
    ]
    if any(re.search(pattern, prompt, re.IGNORECASE) for pattern in sensitive_patterns):
        return "I’m sorry, I can’t assist with that. Please contact Aven support directly at support@aven.com."

    try:
        model = SentenceTransformer('sentence-transformers/all-mpnet-base-v2')
    except Exception as e:
        logger.error(f"Error initializing Sentence Transformers model: {str(e)}")
        return None
    try:
        query_embedding = model.encode(prompt, show_progress_bar=False).tolist()
    except Exception as e:
        logger.error(f"Error encoding query: {str(e)}")
        return None
    try:
        api_key = os.environ.get('PINECONE_API_KEY', 'pcsk_35ZMWD_5Q7dfwZD6UWx7UFfzvGY1dn7gDGxL5oQosr4Q3gxQ8YcdbWHjt6RCszMvusC9kh')
        if not api_key:
            raise ValueError("PINECONE_API_KEY is not set")
        pc = Pinecone(api_key=api_key)
        index_name = "aven-embeddings"
        index = pc.Index(index_name)
    except Exception as e:
        logger.error(f"Error connecting to Pinecone: {str(e)}")
        return None
    try:
        query_results = index.query(vector=query_embedding, top_k=top_k, include_metadata=True)
        retrieved_docs = query_results['matches']
        logger.info(f"Retrieved {len(retrieved_docs)} documents:")
        for doc in retrieved_docs:
            logger.info(f"ID: {doc['id']}, Score: {doc['score']}, URL: {doc['metadata']['url']}, Title: {doc['metadata']['title']}")
    except Exception as e:
        logger.error(f"Error querying Pinecone: {str(e)}")
        return None

    try:
        redis = Redis.from_env()
        redis.ping()
        history = redis.lrange(f'user:{user_id}:history', 0, 5)
        history_context = '\n'.join([h.decode() for h in history]) if history else ''
        response = await generate_response(f"{history_context}\n\n{prompt}" if history_context else prompt, retrieved_docs, tone)
        redis.lpush(f'user:{user_id}:history', f"Q: {prompt}\nA: {response}")
        redis.close()
        return response
    except Exception as e:
        logger.warning(f"Redis connection failed: {str(e)}. Proceeding without history.")
        response = await generate_response(prompt, retrieved_docs, tone)
        return response

@app.route('/rag', methods=['POST'])
def rag_endpoint():
    data = request.get_json()
    prompt = data.get('prompt')
    user_id = data.get('user_id', 'default-user')
    tone = data.get('tone', 'neutral')
    if not prompt:
        return jsonify({'error': 'Missing prompt'}), 400
    try:
        response = asyncio.run(test_rag(prompt, top_k=3, user_id=user_id, tone=tone))
        if response is None:
            return jsonify({'error': 'Failed to generate response'}), 500
        return jsonify({'response': response})
    except Exception as e:
        logger.error(f"Error in rag_endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500

# @app.route('/vapi/call/web', methods=['POST'])
# def vapi_proxy():
#     try:
#         vapi_api_key = os.environ.get('VAPI_API_KEY')
#         if not vapi_api_key:
#             raise ValueError("VAPI_API_KEY is not set")
#         data = request.get_json()
#         headers = {
#             'Authorization': f'Bearer {vapi_api_key}',
#             'Content-Type': 'application/json',
#         }
#         response = requests.post('https://api.vapi.ai/call/web', json=data, headers=headers)
#         response.raise_for_status()
#         return jsonify(response.json())
#     except Exception as e:
#         logger.error(f"Error in Vapi proxy: {str(e)}")
#         return jsonify({'error': str(e)}), 400

@app.route('/feedback', methods=['POST'])
def feedback_endpoint():
    data = request.get_json()
    prompt = data.get('prompt')
    response = data.get('response')
    feedback = data.get('feedback')
    if feedback == 'positive':
        try:
            model = SentenceTransformer('sentence-transformers/all-mpnet-base-v2')
            embedding = model.encode(response, show_progress_bar=False).tolist()
            api_key = os.environ.get('PINECONE_API_KEY', 'pcsk_35ZMWD_5Q7dfwZD6UWx7UFfzvGY1dn7gDGxL5oQosr4Q3gxQ8YcdbWHjt6RCszMvusC9kh')
            pc = Pinecone(api_key=api_key)
            index = pc.Index('aven-embeddings')
            index.upsert([{'id': f'doc-{int(time.time())}', 'values': embedding, 'metadata': {'text': response, 'approved': True}}])
        except Exception as e:
            logger.error(f"Error saving feedback: {str(e)}")
    return jsonify({'status': 'Feedback recorded'})

if __name__ == "__main__":
    app.run(debug=True)