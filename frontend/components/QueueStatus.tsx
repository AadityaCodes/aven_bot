import { useState, useEffect } from 'react';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

export default function QueueStatus() {
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const userId = 'user-id'; // Replace with actual user ID (e.g., from auth)

  useEffect(() => {
    const checkQueue = async () => {
      const position = await redis.lpos('agent-queue', userId);
      setQueuePosition(position);
    };
    checkQueue();
    const interval = setInterval(checkQueue, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const joinQueue = async () => {
    await redis.rpush('agent-queue', userId);
    setQueuePosition(await redis.lpos('agent-queue', userId));
  };

  return (
    <div className="mt-4">
      {queuePosition !== null ? (
        <p className="text-gray-700">Queue Position: {queuePosition + 1}</p>
      ) : (
        <button
          onClick={joinQueue}
          className="p-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          Connect to Human Agent
        </button>
      )}
    </div>
  );
}