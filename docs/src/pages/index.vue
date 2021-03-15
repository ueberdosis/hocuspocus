<template>
  <Layout :show-sidebar="false">
    <app-section>
      <div class="text">
        <h1 class="is-large">
          The plug & play collaboration backend
        </h1>
        <p class="is-large">
          Real-time collaboration, offline-first apps and syncing devices isn’t hard anymore. With the conflict-free magic of hocuspocus.
        </p>
        <div>
          <newsletter-form
            id="d6ab5e0a-5c27-47e1-bad1-e8b8fb869925"
            button-label="Request Early Access"
          />
        </div>
      </div>
    </app-section>

    <app-section>
      <feature-list>
        <feature-item>
          <h3 class="is-h2">
            Real-time collaboration
          </h3>
          <p>
            Share changes, cursor positions, text selections, or even the whole application state with other people in real-time.
          </p>
        </feature-item>

        <feature-item>
          <h3 class="is-h2">
            Everything in sync
          </h3>
          <p>
            Enable people to edit their data on multiple devices, and keep everything in sync with hocuspocus
          </p>
        </feature-item>

        <feature-item>
          <h3 class="is-h2">
            Offline-first
          </h3>
          <p>
            Store changes in the browser, and send them later. hocuspocus will merge them, no matter when they are delivered.
          </p>
        </feature-item>

        <feature-item>
          <h3 class="is-h2">
            Conflict-free
          </h3>
          <p>
            hocuspocus is based on the performant and conflict-free Y.js. It’s like a superfast Git, without the merge conflicts.
          </p>
        </feature-item>

        <feature-item>
          <h3 class="is-h2">
            TypeScript code base
          </h3>
          <p>
            TypeScript ensures code quality and gives a nice autocomplete for the API on top of the extensive human written documentation.
          </p>
        </feature-item>

        <feature-item>
          <h3 class="is-h2">
            Well documented
          </h3>
          <p>
            We write the documentation while we write the code. You’ll find a lot of guides, examples and even background knowledge here.
          </p>
        </feature-item>

        <feature-item>
          <h3 class="is-h2">
            Scalable with Redis
          </h3>
          <p>
            You can spin up multiple instances of hocuspocus and keep them in sync with Redis. Support for Redis clusters is already baked-in.
          </p>
        </feature-item>

        <feature-item>
          <h3 class="is-h2">
            Support from humans
          </h3>
          <p>
            hocuspocus receives regular updates, maintenance and reliable support, directly from the developers.
          </p>
        </feature-item>
      </feature-list>
    </app-section>

    <app-section>
      <div class="text">
        <h2>
          A tiny preview
        </h2>
        <p>
          Not teased enough? Here is some example code.
        </p>
<!-- eslint-disable -->
<prism language="js" :code="`import { Server } from '@hocuspocus/server'
import { RocksDB } from '@hocuspocus/rocksdb'

const server = Server.configure({
  port: 80,

  async onConnect() {
    console.log('🔮')
  }

  extensions: [
    new RocksDB({
      path: './database',
    }),
  ],
})

server.listen()`" />
      </div>
    </app-section>

    <!-- <app-section>
      <div class="text">
        <h2 class="is-h1">
          License
        </h2>
      </div>
    </app-section> -->
  </Layout>
</template>

<script>
import AppSection from '@/components/AppSection'
import FeatureList from '@/components/FeatureList'
import FeatureItem from '@/components/FeatureItem'
import NewsletterForm from '@/components/NewsletterForm'
import Prism from '~/components/Prism'

export default {
  components: {
    AppSection,
    FeatureList,
    FeatureItem,
    NewsletterForm,
    Prism,
  },

  metaInfo() {
    const title = 'Collaboration backend for text editing and more.'

    return {
      title,
      meta: [
        /* OpenGraph */
        {
          property: 'og:title',
          content: title,
        },
        {
          property: 'og:image',
          content: 'https://hocuspocus.dev/images/og-image.png',
        },
        /* Twitter */
        {
          name: 'twitter:title',
          content: title,
        },
        {
          name: 'twitter:card',
          content: 'summary_large_image',
        },
        {
          name: 'twitter:image',
          content: 'https://hocuspocus.dev/images/og-image.png',
        },
        {
          name: 'twitter:site',
          content: '@_ueberdosis',
        },
      ],
    }
  },
}
</script>
