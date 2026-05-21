$body = '{"topic":"糖尿病患者饮食应注意什么","platform":"wechat","wordCount":800}'
Invoke-RestMethod -Uri "http://localhost:3000/api/generate" -Method Post -ContentType "application/json" -Body $body