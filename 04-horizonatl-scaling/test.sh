for j in {1..10}; do  for i in {1..1000}; do
    curl -s -o /dev/null -w "%{http_code}\n" http://a0fbf831ca4a94936954790ef7a89bc4-104519041.ap-south-1.elb.amazonaws.com/ &  done
  waitdone
