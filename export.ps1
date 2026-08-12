$headers = @{
    "x-hasura-admin-secret" = "nhost-admin-secret"
    "Content-Type" = "application/json"
}
$body = @{
    type = "export_metadata"
    args = @{}
} | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://127.0.0.1:1337/v1/metadata" -Method Post -Headers $headers -Body $body
$response | ConvertTo-Json -Depth 10 > metadata_export.json
