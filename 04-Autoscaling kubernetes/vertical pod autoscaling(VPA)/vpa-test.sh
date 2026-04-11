#!/bin/bash

echo "=============================="
echo "VPA TEST STARTED"
echo "=============================="

# Step 1: Show current pods
echo ""
echo "📦 Current Pods:"
kubectl get pods -l app=hamster

# Step 2: Show initial resource usage
echo ""
echo "📊 Initial Resource Usage:"
kubectl top pods -l app=hamster

# Step 3: Wait for VPA to generate recommendations
echo ""
echo "⏳ Waiting 60 seconds for VPA recommendations..."
sleep 60

# Step 4: Show VPA recommendations
echo ""
echo "📈 VPA Recommendations:"
kubectl describe vpa hamster-vpa | grep -A 10 "Recommendation"

# Step 5: Watch pod restart (because of Recreate mode)
echo ""
echo "🔄 Watching Pod Restart:"
kubectl get pods -l app=hamster -w
