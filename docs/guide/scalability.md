---
tableOfContents: true
---

# Scalability

## Introduction

If you are trying to deploy hocuspocus in a HA setup or solve issues due to too many connections / network traffic,
you can use our redis extension: [extension-redis](/api/extensions/redis).

Yjs is really efficient (see https://blog.kevinjahns.de/are-crdts-suitable-for-shared-editing/), so if you're having issues about
cpu / memory usage, our suggested solution at the moment is to deploy multiple independent hocuspocus instances and split users by a document
identifier.
