Currently:
- Basic MVP of URL shortening mainly to show project/infra setup and deployment process.
- Currently 301 since our redirects are permanent. Can use 302 for temporary redirects.
- Using LLM (copilot) to assist with basic scaffolding + most of the frontend portion.

Going further: 
- What scale should we assume this is for?
- What other features from bit.ly do we want copied?
- I'll implement a simple user dashboard with link creation history/click count. Any other analytics do we want to collect?
- I'll implement basic email/pwd auth, any other method of authentication wanted?
- Module graph for NestJS (is there a way people automate this?)
- Using default nanoid(7), I'm leaving it as default (A-Za-z0-9_-) - Do we want this to be alphanumeric?