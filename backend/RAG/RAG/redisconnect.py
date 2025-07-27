from upstash_redis import Redis

redis = Redis(url="redis-url", token="redis-token")

redis.set("foo", "bar")
value = redis.get("foo")
