#!/bin/bash
cd /Users/jrepp/hc/hermes/web
MIRAGE_ENABLED=false yarn ember server --port 4200 --proxy http://localhost:8001
