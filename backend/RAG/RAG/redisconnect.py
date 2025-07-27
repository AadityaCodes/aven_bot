from upstash_redis import Redis

redis = Redis(url="https://loyal-garfish-56713.upstash.io", token="Ad2JAAIjcDE0NmU2ZDAxYjJiNDk0MWY0ODAwZDAyODNmMDg5ZmMzY3AxMA")

redis.set("foo", "bar")
value = redis.get("foo")