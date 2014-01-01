# requires current sandbox code in sandbox_client_secret.txt 
client_secret_filename="sandbox_client_secret.txt"
if [ ! -e "$client_secret_filename" ]; then
    echo "Client secret file $client_secret_filename required."
    exit -1
fi
    
temp_dir=$(mktemp -dt "$0")
auth_response_file=$temp_dir/auth_response_file
token_response_file=$temp_dir/token_response_file
client_secret=$(cat $client_secret_filename)
(
# need -i 1 for 1 second delay, otherwise sent before browser make request?
printf "HTTP/1.1 200 OK\r\n\r\n <html>$(date)</html?>" | nc -v -v -i 1 -n -l 8080 > $auth_response_file
echo "nc exit code $?."
)&

child_pid=$!

#curl -v -v "http://localhost:8080"
#exit

open "http://sandbox.feedly.com/v3/auth/auth?response_type=code&client_id=sandbox&client_secret=$client_secret&redirect_uri=http://localhost:8080&scope=https://cloud.feedly.com/subscriptions&provider=google"
#sandbox doesn't bypass oauth - http://localhost/?code=...&state=
# GET /?code=...&state= HTTP/1.1


wait $child_pid

if [ ! -s $auth_response_file ]; then
    echo "last exit code $?."
    echo "failed to auth"
    exit -1
fi

code=$(grep code $auth_response_file | sed 's/.*code=\([[:alnum:]]*\).*/\1/')
curl --verbose --data "code=$code&client_id=sandbox&client_secret=$client_secret&redirect_uri=http://localhost:8080&grant_type=authorization_code" http://sandbox.feedly.com/v3/auth/token > $token_response_file

#{"plan":"standard","access_token":"...:sandbox","refresh_token":"...:sandbox","expires_in":604800,"token_type":"Bearer","id":"10f8ec78-deba-43d0-862e-d3247d252a1a"}macnboss:josh.js dougbeal$ 

extract=( "access_token" "refresh_token" "id")
for i in ${extract[@]}; do
    declare ${i}=$(grep ${i} $token_response_file | sed "s/.*\"${i}\":\"\([^\"]*\)\".*/\1/")
done
curl --verbose --header "Authorization: OAuth $access_token" http://sandbox.feedly.com/v3/tags > $temp_dir/tags
curl --verbose --header "Authorization: OAuth $access_token" http://sandbox.feedly.com/v3/categories > $temp_dir/categories
curl --verbose --header "Authorization: OAuth $access_token" http://sandbox.feedly.com/v3/subscriptions > $temp_dir/subscriptions
