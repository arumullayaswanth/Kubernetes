#!/bin/bash

# Set your LoadBalancer URL here
URL="http://<your-loadbalancer-url>"

# Outer loop (repeat 10 times)
for j in {1..10}; do
  
  # Inner loop (1000 requests in parallel)
  for i in {1..1000}; do
    
    # Send request silently in background
    curl -s -o /dev/null $URL &
  
  done

  # Wait for all background jobs to finish
  wait

done

# Update your load balance For example Like this
# http://a0fbf831ca4a94936954790ef7a89bc4-104519041.ap-south-1.elb.amazonaws.com/
