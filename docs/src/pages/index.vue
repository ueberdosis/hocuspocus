<template>
  <Layout :show-sidebar="false">
    <app-section>
      <div class="text">
        <h1 class="is-large">
          hocuspocus
        </h1>
        <p class="is-large">
          hocuspocus is a plug & play collaboration backend. It’s based on Y.js, a CRDT framework with a powerful abstraction of shared data. You can use it, to keep multiple instances of text editors in sync, work offline and sync changes later, or sync text between different devices. Also, you can use it to build anything else, that needs to be collaboration, for example a collaborative drawing app.
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

    <app-section>
      <div class="text">
        <h2 class="is-h1">
          License
        </h2>
        <p>
          You can use hocuspocus in all kinds of projects, you can <g-link to="https://store.ueber.io/products/hocuspocus">buy an appropriate license and download the package</g-link> for $99/year for single developers, and $499/year for teams. Local taxes may apply.
        </p>
      </div>
    </app-section>
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
    const title = 'Headless WYSIWYG Text Editor'

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
          content: 'https://next.tiptap.dev/images/og-image.png',
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
          content: 'https://next.tiptap.dev/images/og-image.png',
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
