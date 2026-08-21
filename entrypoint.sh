#!/bin/sh
# entrypoint.sh
find /app/userDataDir -name "SingletonLock" -delete 2>/dev/null
find /app/userDataDir -name "SingletonSocket" -delete 2>/dev/null
find /app/userDataDir -name "SingletonCookie" -delete 2>/dev/null

exec "$@"
