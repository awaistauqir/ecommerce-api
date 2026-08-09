# 🛒 Production-Grade E-Commerce API

A **senior-level**, production-ready REST API built with Node.js, TypeScript, Express, MongoDB, and Redis. This project demonstrates enterprise-grade practices including authentication, caching, payment processing, observability, and containerization.

## 🏗️ Architecture

```mermaid
graph TB
    Client[Client App] -->|HTTP/HTTPS| API[Express API]
    API -->|JWT Auth| Auth[Auth Service]
    API -->|Business Logic| Services[Feature Services]
    Services -->|CRUD| MongoDB[(MongoDB)]
    API -->|Cache| Redis[(Redis)]
    API -->|Payments| Stripe[Stripe API]
    Stripe -->|Webhooks| API

    subgraph Observability
        API -->|Logs| Pino[Pino Logger]
        API -->|Metrics| Prometheus[Prometheus]
    end
```
