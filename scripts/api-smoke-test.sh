#!/bin/bash
# End-to-end API smoke test for MALÈTE KITS
BASE=http://localhost:3000
JAR=/tmp/mk-cookies.txt
rm -f $JAR

echo "=== 1. Get a product ==="
PSLUG=$(curl -s "$BASE/api/products?q=Real%20Madrid&kit=HOME" | python3 -c "
import json,sys
d = json.load(sys.stdin)
print(d['products'][0]['slug'])
")
PRODUCT=$(curl -s "$BASE/api/products/$PSLUG" | python3 -c "
import json,sys
d = json.load(sys.stdin)
p = d['product']
print(p['id'], p['variants'][2]['id'], p['variants'][2]['size'], p['variants'][2]['stock'])
")
read -r PID VID SIZE STOCK <<< "$PRODUCT"
echo "product=$PID variant=$VID size=$SIZE stock=$STOCK"

echo "=== 2. Create order (guest checkout + customization + promo + delivery) ==="
ORDER=$(curl -s -X POST "$BASE/api/orders" -H 'content-type: application/json' -d "{
  \"idempotencyKey\": \"test-$(date +%s)\",
  \"fullName\": \"Test Student\",
  \"email\": \"test.student@kwasu.edu.ng\",
  \"phone\": \"08012345679\",
  \"items\": [{
    \"productId\": \"$PID\",
    \"variantId\": \"$VID\",
    \"jerseyType\": \"PLAYER\",
    \"size\": \"$SIZE\",
    \"quantity\": 2,
    \"customization\": {\"playerName\": \"MBAPPE\", \"playerNumber\": 9}
  }],
  \"fulfillmentMethod\": \"DELIVERY\",
  \"deliveryZone\": \"MALETE\",
  \"address\": \"Peace Lodge Room 4, Off Campus Road\",
  \"landmark\": \"Near KT Gate\",
  \"instructions\": \"Call when you arrive\",
  \"promoCode\": \"KWASU10\"
}")
echo "$ORDER" | python3 -c "
import json,sys
d = json.load(sys.stdin)
o = d['order']
print('duplicate:', d['duplicate'])
print('orderNumber:', o['orderNumber'])
print('subtotal:', o['subtotal'], '(expect 2 x (12000+4500) = 33000)')
print('customizationFee:', o['customizationFee'], '(expect 2x2000 = 4000)')
print('deliveryFee:', o['deliveryFee'], '(expect 1000)')
print('discount:', o['discount'], '(expect 10% of 33000 = 3300, capped 2000)')
print('total:', o['total'], '(expect 33000+4000+1000-2000 = 36000)')
print('paymentStatus:', o['paymentStatus'], '| status:', o['status'])
print('waShareLink present:', bool(o.get('whatsappShareLink')))
print('token present:', 'trackingToken' in json.dumps(o))
" 
ORDERNUM=$(echo "$ORDER" | python3 -c "import json,sys; print(json.load(sys.stdin)['order']['orderNumber'])")
TOKEN=$(echo "$ORDER" | python3 -c "import json,sys; print(json.load(sys.stdin)['order'].get('trackingToken',''))")

echo "=== 3. Stock decremented? (was $STOCK) ==="
curl -s "$BASE/api/products/$PSLUG" | python3 -c "
import json,sys
d = json.load(sys.stdin)
v = [x for x in d['product']['variants'] if x['id']=='$VID'][0]
print('now:', v['stock'], '(expect $(($STOCK - 2)))')
"

echo "=== 4. Idempotency: replay same key ==="
KEY=$(echo "$ORDER" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['order']['idempotencyKey'])" 2>/dev/null)
curl -s -X POST "$BASE/api/orders" -H 'content-type: application/json' -d "{
  \"idempotencyKey\": \"$(echo $ORDER | python3 -c "import json,sys; print(json.load(sys.stdin)['order']['idempotencyKey'])")\",
  \"fullName\": \"Test Student\",
  \"email\": \"test.student@kwasu.edu.ng\",
  \"phone\": \"08012345679\",
  \"items\": [{\"productId\": \"$PID\", \"variantId\": \"$VID\", \"jerseyType\": \"FAN\", \"size\": \"$SIZE\", \"quantity\": 5}],
  \"fulfillmentMethod\": \"PICKUP\"
}" | python3 -c "
import json,sys
d = json.load(sys.stdin)
print('duplicate returned:', d.get('duplicate'), '| same order:', d['order']['orderNumber'] == '$ORDERNUM')
"

echo "=== 5. Track via order number + phone ==="
curl -s -X POST "$BASE/api/orders/track" -H 'content-type: application/json' -d "{\"orderNumber\": \"$ORDERNUM\", \"identifier\": \"08012345679\"}" | python3 -c "
import json,sys
d = json.load(sys.stdin)
o = d['order']
print('tracked:', o['orderNumber'], '| items:', len(o['items']), '| history:', len(o.get('statusHistory', [])))
print('leaks idempotencyKey?', 'idempotencyKey' in json.dumps(d))
"
echo "=== 5b. Track with WRONG identifier (should 404) ==="
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$BASE/api/orders/track" -H 'content-type: application/json' -d "{\"orderNumber\": \"$ORDERNUM\", \"identifier\": \"08099999999\"}"

echo "=== 6. Admin auth guard (should 401) ==="
curl -s -o /dev/null -w "stats: %{http_code}\n" "$BASE/api/admin/stats"

echo "=== 7. Admin login ==="
curl -s -c $JAR -X POST "$BASE/api/admin/login" -H 'content-type: application/json' -d '{"email": "owner@maletekits.com", "password": "MaleteAdmin@2026!"}' | python3 -c "import json,sys; print('login:', json.load(sys.stdin)['admin']['email'])"

echo "=== 8. Admin stats ==="
curl -s -b $JAR "$BASE/api/admin/stats" | python3 -c "
import json,sys
s = json.load(sys.stdin)['stats']
print('total:', s['total'], '| awaitingConfirmation:', s['awaitingConfirmation'], '| awaitingPayment:', s['awaitingPayment'])
"

echo "=== 9. Notification logs for the order (email should FAIL — no Brevo creds) ==="
curl -s -b $JAR "$BASE/api/admin/notifications?status=FAILED" | python3 -c "
import json,sys
logs = json.load(sys.stdin)['logs']
for l in logs[:3]:
    print(l['channel'], '->', l['status'], '| attempts:', l['attempts'], '| err:', (l['error'] or '')[:80])
"

echo "=== 10. Admin order status flow: confirm → processing ==="
OID=$(curl -s -b $JAR "$BASE/api/admin/orders?q=$ORDERNUM" | python3 -c "import json,sys; print(json.load(sys.stdin)['orders'][0]['id'])")
curl -s -b $JAR -X PATCH "$BASE/api/admin/orders/$OID" -H 'content-type: application/json' -d '{"action": "STATUS", "status": "CONFIRMED", "note": "All items available"}' | python3 -c "import json,sys; print('status now:', json.load(sys.stdin)['order']['status'])"

echo "=== 11. Payment without verification note (should 422) ==="
curl -s -o /dev/null -w "%{http_code}\n" -b $JAR -X PATCH "$BASE/api/admin/orders/$OID" -H 'content-type: application/json' -d '{"action": "PAYMENT", "paymentStatus": "PAID", "method": "BANK_TRANSFER"}'

echo "=== 12. Payment WITH verification note ==="
curl -s -b $JAR -X PATCH "$BASE/api/admin/orders/$OID" -H 'content-type: application/json' -d '{"action": "PAYMENT", "paymentStatus": "PAID", "method": "BANK_TRANSFER", "reference": "FT-TEST-001", "note": "Checked bank app — credit alert of N36,000 seen"}' | python3 -c "import json,sys; o=json.load(sys.stdin)['order']; print('payment:', o['paymentStatus'])"

echo "=== 13. Complete order ==="
curl -s -b $JAR -X PATCH "$BASE/api/admin/orders/$OID" -H 'content-type: application/json' -d '{"action": "STATUS", "status": "PROCESSING"}' | python3 -c "import json,sys; print('status:', json.load(sys.stdin)['order']['status'])"
curl -s -b $JAR -X PATCH "$BASE/api/admin/orders/$OID" -H 'content-type: application/json' -d '{"action": "STATUS", "status": "COMPLETED"}' | python3 -c "import json,sys; print('status:', json.load(sys.stdin)['order']['status'])"

echo "=== 14. Cancel+restock test: create then cancel another order ==="
ORDER2=$(curl -s -X POST "$BASE/api/orders" -H 'content-type: application/json' -d "{
  \"idempotencyKey\": \"test-cancel-$(date +%s)\",
  \"fullName\": \"Cancel Test\",
  \"email\": \"cancel@test.com\",
  \"phone\": \"08123456780\",
  \"items\": [{\"productId\": \"$PID\", \"variantId\": \"$VID\", \"jerseyType\": \"FAN\", \"size\": \"$SIZE\", \"quantity\": 3}],
  \"fulfillmentMethod\": \"PICKUP\"
}")
O2ID=$(echo "$ORDER2" | python3 -c "import json,sys; print(json.load(sys.stdin)['order']['id'])")
curl -s -b $JAR -X PATCH "$BASE/api/admin/orders/$O2ID" -H 'content-type: application/json' -d '{"action": "CANCEL", "note": "Duplicate request"}' | python3 -c "import json,sys; o=json.load(sys.stdin)['order']; print('cancelled:', o['status'])"
curl -s "$BASE/api/products/$PSLUG" | python3 -c "
import json,sys
d = json.load(sys.stdin)
v = [x for x in d['product']['variants'] if x['id']=='$VID'][0]
print('stock restored to:', v['stock'], '(expect $(($STOCK - 2)))')
"

echo "=== 15. Validation: bad phone (should 422) ==="
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$BASE/api/orders" -H 'content-type: application/json' -d "{
  \"idempotencyKey\": \"test-bad-$(date +%s)\",
  \"fullName\": \"Bad Phone\",
  \"email\": \"bad@test.com\",
  \"phone\": \"12345\",
  \"items\": [{\"productId\": \"$PID\", \"variantId\": \"$VID\", \"jerseyType\": \"FAN\", \"size\": \"$SIZE\", \"quantity\": 1}],
  \"fulfillmentMethod\": \"PICKUP\"
}"

echo "=== 16. Over-stock order (should 400) ==="
curl -s -X POST "$BASE/api/orders" -H 'content-type: application/json' -d "{
  \"idempotencyKey\": \"test-stock-$(date +%s)\",
  \"fullName\": \"Stock Test\",
  \"email\": \"stock@test.com\",
  \"phone\": \"08123456781\",
  \"items\": [{\"productId\": \"$PID\", \"variantId\": \"$VID\", \"jerseyType\": \"FAN\", \"size\": \"$SIZE\", \"quantity\": 10}],
  \"fulfillmentMethod\": \"PICKUP\"
}" | python3 -c "import json,sys; print('error:', json.load(sys.stdin).get('error','')[:100])"

echo "=== DONE ==="
