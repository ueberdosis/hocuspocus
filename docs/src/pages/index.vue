<template>
  <Layout :show-sidebar="false">
    <app-section>
      <div class="text">
        <h1 class="is-large">
          The plug & play collaboration backend
        </h1>
        <p class="is-large">
          Real-time collaboration, syncing between different devices and working offline isn’t hard anymore. Keep everything in sync with the magic of Y.js.
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
            Share changes, cursors and selection, or even an application state between with other people in real-time.
          </p>
        </feature-item>

        <feature-item>
          <h3 class="is-h2">
            Sync multiple devices
          </h3>
          <p>
            Enable people to edit their data on multiple devices, and keep everything in sync with hocuspocus.
          </p>
        </feature-item>

        <feature-item>
          <h3 class="is-h2">
            Work offline
          </h3>
          <p>
            Store changes in the browser, and wait to upload them. hocuspocus will merge this changes, no matter when they are delivered.
          </p>
        </feature-item>

        <feature-item>
          <h3 class="is-h2">
            Conflict-free
          </h3>
          <p>
            Y.js is a performant, conflict-free replicated data type implementation. Sync all your changes. No matter when they come in, they’ll be merged without conflicts.
          </p>
        </feature-item>

        <feature-item>
          <h3 class="is-h2">
            TypeScript
          </h3>
          <p>
            hocuspocus is written in TypeScript. That helps us to find bugs early and gives you a nice autocomplete for the API (if your IDE supports that) on top of the extensive human written documentation.
          </p>
        </feature-item>

        <feature-item>
          <h3 class="is-h2">
            Well documented
          </h3>
          <p>
            The documentation is a top priority for us, you’ll find a lot of guides, examples and even background knowledge here.
          </p>
        </feature-item>

        <feature-item>
          <h3 class="is-h2">
            Scalable
          </h3>
          <p>
            You can spin up multiple instances of it and keep everything in sync with Redis. Support for Redis clusters is also baked-in.
          </p>
        </feature-item>

        <feature-item>
          <h3 class="is-h2">
            Actively maintained
          </h3>
          <p>
            hocuspocus comes with a price tag, but that ensures constant development, maintenance and suppport.
          </p>
        </feature-item>
      </feature-list>
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

export default {
  components: {
    AppSection,
    FeatureList,
    FeatureItem,
    NewsletterForm,
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
