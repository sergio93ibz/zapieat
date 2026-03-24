$Content = Get-Content prisma\schema.prisma
$Content | Set-Content -Encoding UTF8 prisma\schema_utf8.prisma
& pscp -batch -pw Sergio93@ prisma\schema_utf8.prisma root@84.54.23.26:/root/zasfood/prisma/schema.prisma
& plink -batch -pw Sergio93@ root@84.54.23.26 "cd /root/zasfood && docker compose up -d --build"
