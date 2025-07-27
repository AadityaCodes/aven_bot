// 'use client';
// import { useState, useRef, useEffect } from 'react';
// import axios from 'axios';
// import VoiceAssistant from './VoiceAssistant';

// export default function ChatInterface() {
//   const [query, setQuery] = useState<string>('');
//   const [response, setResponse] = useState<string>('');
//   const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);
//   const [isLoading, setIsLoading] = useState<boolean>(false);
//   const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([]);
//   const chatEndRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     if (response) {
//       setMessages((prev) => [...prev, { role: 'bot', text: response }]);
//       setIsLoading(false);
//     }
//   }, [response]);

//   useEffect(() => {
//     chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   }, [messages]);

//   const handleSubmit = async () => {
//     if (!query) return;
//     setIsLoading(true);
//     setMessages((prev) => [...prev, { role: 'user', text: query }]);
//     try {
//       const res = await axios.post(process.env.NEXT_PUBLIC_FLASK_API_URL!, {
//         prompt: query,
//         user_id: 'user-id', // Replace with actual user ID
//       });
//       setResponse(res.data.response);
//       setFeedback(null);
//     } catch (error) {
//       setResponse('Error fetching response from the server');
//     }
//     setQuery('');
//   };

//   const submitFeedback = async (type: 'positive' | 'negative') => {
//     setFeedback(type);
//     try {
//       await axios.post(`${process.env.NEXT_PUBLIC_FLASK_API_URL}/feedback`, {
//         prompt: messages[messages.length - 2]?.text || query,
//         response,
//         feedback: type,
//       });
//     } catch (error) {
//       console.error('Error submitting feedback:', error);
//     }
//   };

//   return (
//     <div className="h-screen dynamic-background flex items-start justify-center pt-2 px-4 md:pt-3 md:px-6 lg:pt-4 lg:px-8">
//       {/* Main Chat Container - Properly sized and positioned */}
//       <div className="w-full max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl glass-morphism-strong rounded-3xl shadow-2xl flex flex-col @container animate-scale-in" style={{ height: 'calc(100vh - 1rem)' }}>

//         {/* Header Section */}
//         <div className="flex items-center gap-3 px-4 py-4 md:px-6 md:py-5 lg:px-8 lg:py-6 border-b border-white/20 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-t-3xl relative overflow-hidden">
//           {/* Header background animation overlay */}
//           <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 animate-pulse-glow"></div>

//           {/* Enhanced Avatar Container with Dynamic State Indicators */}
//           <div className="relative z-10 avatar-container">
//             <div className={`avatar-wrapper ${isLoading ? 'avatar-thinking' : 'avatar-idle'}`}>
//               <img
//                 src={`/aven-ally-${isLoading ? 'typing' : 'idle'}.gif`}
//                 alt="Aven Assistant"
//                 className="avatar-image"
//                 role="img"
//                 aria-label={`Aven is currently ${isLoading ? 'thinking and processing your request' : 'ready to help you'}`}
//               />
//               {/* Dynamic Status Indicator */}
//               <div className={`avatar-status-indicator ${isLoading ? 'status-active' : 'status-idle'}`} aria-hidden="true">
//                 <div className="status-dot"></div>
//               </div>
//               {/* Animated Ring for Enhanced Visual Appeal */}
//               <div className={`avatar-ring ${isLoading ? 'ring-active' : 'ring-idle'}`} aria-hidden="true"></div>
//             </div>
//           </div>

//           {/* Enhanced Typography and Visual Hierarchy */}
//           <div className="relative z-10 header-content">
//             <h1 className="header-title">
//               Aven
//               <span className="title-accent" aria-hidden="true"></span>
//             </h1>
//             <div className="header-subtitle-container">
//               <p className={`header-subtitle ${isLoading ? 'subtitle-active' : 'subtitle-idle'}`}>
//                 <span className="status-icon" aria-hidden="true">
//                   {isLoading ? '🧠' : '💬'}
//                 </span>
//                 <span className="status-text">
//                   {isLoading ? 'Thinking...' : 'Your AI Assistant'}
//                 </span>
//               </p>
//               {/* Subtle progress indicator when loading */}
//               {isLoading && (
//                 <div className="thinking-indicator" aria-hidden="true">
//                   <div className="thinking-dots">
//                     <span></span>
//                     <span></span>
//                     <span></span>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* Chat Area - Flexible height with enhanced message display */}
//         <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 glass-morphism-subtle chat-area chat-scroll">
//           {messages.length === 0 && (
//             <div className="flex items-center justify-center h-full animate-slide-up">
//               <div className="text-center text-gray-400 responsive-text-sm">
//                 <div className="mb-2 text-2xl md:text-3xl lg:text-4xl">💬</div>
//                 <div>Ask me anything about Aven!</div>
//                 <div className="text-xs md:text-sm mt-2 opacity-75">Start a conversation to get help with your questions</div>
//               </div>
//             </div>
//           )}
          
//           {/* Enhanced Message Display with Glass-morphism and Animations */}
//           {messages.map((msg, idx) => {
//             const isConsecutive = idx > 0 && messages[idx - 1].role === msg.role;
//             const messageDate = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
//             return (
//               <div
//                 key={idx}
//                 className={`message-container ${msg.role} ${isConsecutive ? 'grouped' : ''} ${
//                   msg.role === 'user' ? 'animate-message-user' : 'animate-message-bot'
//                 }`}
//                 style={{ animationDelay: `${idx * 0.1}s` }}
//               >
//                 <div className="message-wrapper">
//                   <div
//                     className={`rounded-2xl px-4 py-3 md:px-5 md:py-4 lg:px-6 lg:py-5 ${
//                       msg.role === 'user'
//                         ? 'message-bubble-user rounded-br-none'
//                         : 'message-bubble-bot rounded-bl-none'
//                     }`}
//                   >
//                     <div className="message-text">
//                       {msg.text}
//                     </div>
                    
//                     {/* Message timestamp - appears on hover */}
//                     <div className="message-timestamp">
//                       {messageDate}
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             );
//           })}
          
//           {/* Loading indicator with enhanced animation */}
//           {isLoading && (
//             <div className="message-container bot animate-message-bot">
//               <div className="message-wrapper">
//                 <div className="message-bubble-bot rounded-2xl px-4 py-3 md:px-5 md:py-4 lg:px-6 lg:py-5 rounded-bl-none">
//                   <div className="message-text flex items-center gap-2">
//                     <span>Thinking</span>
//                     <div className="thinking-dots">
//                       <span className="animate-typing"></span>
//                       <span className="animate-typing" style={{ animationDelay: '0.2s' }}></span>
//                       <span className="animate-typing" style={{ animationDelay: '0.4s' }}></span>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}
          
//           <div ref={chatEndRef} />
//         </div>

//         {/* Input Section */}
//         <div className="px-4 py-4 md:px-6 md:py-5 lg:px-8 lg:py-6 border-t border-white/20 glass-morphism-subtle rounded-b-3xl flex flex-col gap-3">
//           <VoiceAssistant
//             setResponse={setResponse}
//             setMessages={setMessages}
//             setIsLoading={setIsLoading}
//             userId="user-id"
//           />

//           {/* Input Controls */}
//           <div className="flex gap-2 md:gap-3">
//             <input
//               type="text"
//               value={query}
//               onChange={(e) => setQuery(e.target.value)}
//               className="flex-1 p-3 md:p-4 rounded-2xl input-enhanced text-gray-700 shadow-sm text-sm md:text-base placeholder:text-gray-400"
//               placeholder="Type your message..."
//               onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
//               disabled={isLoading}
//             />
//             <button
//               onClick={handleSubmit}
//               disabled={isLoading || !query}
//               className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-3 md:px-6 md:py-4 rounded-2xl font-semibold shadow-md hover:from-blue-600 hover:to-purple-600 button-enhanced disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
//             >
//               {isLoading ? (
//                 <span className="animate-spin inline-block w-4 h-4 md:w-5 md:h-5 border-2 border-white border-t-transparent rounded-full"></span>
//               ) : (
//                 'Send'
//               )}
//             </button>
//           </div>

//           {/* Feedback Controls */}
//           {response && (
//             <div className="flex gap-2 justify-end">
//               <button
//                 onClick={() => submitFeedback('positive')}
//                 className={`transition-all duration-200 p-2 md:p-3 rounded-full border-2 border-transparent hover:border-green-400 hover:bg-green-50 text-xl md:text-2xl ${feedback === 'positive' ? 'bg-green-100 border-green-500 scale-110' : ''}`}
//                 title="Helpful"
//               >
//                 👍
//               </button>
//               <button
//                 onClick={() => submitFeedback('negative')}
//                 className={`transition-all duration-200 p-2 md:p-3 rounded-full border-2 border-transparent hover:border-red-400 hover:bg-red-50 text-xl md:text-2xl ${feedback === 'negative' ? 'bg-red-100 border-red-500 scale-110' : ''}`}
//                 title="Not Helpful"
//               >
//                 👎
//               </button>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }