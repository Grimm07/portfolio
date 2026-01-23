# How Cloudflare DNS works

To optimize sites, cloudflare provides dns and cdn services so they can reverse proxy the web traffic to and from your domain.

## DNS
The DNS translates domain names into IP addresses. 
A DNS record is the source-of-truth for what exists and where. DNS records live in authoritative DNS servers and provide information about domains such as:
- IP addressess of servers that host the web content and services on that domain

When you onboard your site/app to cloudflare, it becomes the primary authoritative DNS provider for your domain. 
As the primary authoritative DNS provider, cloudflare responds to DNS queries for your domain and you manage your domain's
    DNS records via the cloudflare dashboard or API.

- Cloudflare only becomes the primary authoritative DNS provider when you use the default, full DNS setup. 

If your domain's status is active and the queried records are set to `proxied`, Cloudflare responds with an **anycast IP address** instead of the origin IP address defined in your DNS table.