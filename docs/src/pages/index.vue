<template>
  <Layout :show-sidebar="false">
    <app-section>
      <div class="text">
        <h1 class="is-large">
          The multiplayer mode for your application
        </h1>
        <p class="is-large">
          hocuspocus is the open source backend to bring real-time syncing, collaborative text editing and true collaboration to your application today. Get started in minutes, scale to millions.
        </p>
        <btn-wrapper>
          <btn
            type="secondary"
            icon="github-fill"
            icon-position="before"
            to="https://github.com/sponsors/ueberdosis"
          >
            Early access on GitHub
          </btn>
        </btn-wrapper>
        <!-- <div>
          <newsletter-form
            id="d6ab5e0a-5c27-47e1-bad1-e8b8fb869925"
            button-label="Request Early Access"
          />
        </div> -->
      </div>
    </app-section>

    <app-section>
      <feature-list>
        <feature-item>
          <h3 class="is-h2">
            Real-time everything
          </h3>
          <p>
            Add real-time syncing to parts of your app, or to the whole app. Integrates well with every backend that speaks HTTP.
          </p>
        </feature-item>

        <feature-item>
          <h3 class="is-h2">
            Collaborative text editing
          </h3>
          <p>
            Make everything a Google doc. Works with tiptap, Quill, Slate, ProseMirror, Monaco, CodeMirror and Atlaskit.
          </p>
        </feature-item>

        <feature-item>
          <h3 class="is-h2">
            Everything in sync
          </h3>
          <p>
            Enable people to edit their data on multiple devices, and keep everything in sync, in real-time.
          </p>
        </feature-item>

        <feature-item>
          <h3 class="is-h2">
            Offline-first
          </h3>
          <p>
            Work offline and store changes in the browser, send them when you’re back online again.
          </p>
        </feature-item>

        <feature-item>
          <h3 class="is-h2">
            Conflict-free
          </h3>
          <p>
            Based on the Y.js conflict-free replication data type. It’s like Git, but superfast and without merge conflicts.
          </p>
        </feature-item>

        <feature-item>
          <h3 class="is-h2">
            Well documented
          </h3>
          <p>
            Documentation is a priority, we’ll write it while we code and that shows. Anything missing? We’ll make sure to add it.
          </p>
        </feature-item>

        <feature-item>
          <h3 class="is-h2">
            Scales with Redis
          </h3>
          <p>
            Spin up multiple instances and keep them in sync with Redis, or even Redis clusters.
          </p>
        </feature-item>

        <feature-item>
          <h3 class="is-h2">
            Open source
          </h3>
          <p>
            Vendor lock-in? Nope, take the code and do whatever you like with it. We’ve worked in open source for years.
          </p>
        </feature-item>

        <feature-item>
          <h3 class="is-h2">
            Written in TypeScript
          </h3>
          <p>
            TypeScript ensures code quality and find bugs early. But don’t worry, no need to learn it.
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
          hocuspocus will be licensed under MIT, and you’ll be free to do whatever you want with it.
          Can’t wait to get access? Become one of our wonderful <g-link to="https://github.com/sponsors/ueberdosis">GitHub sponsors</g-link> and receive an invite immediatly. BTW, we’re officially part of the <g-link to="https://opencollective.com/y-collective">Y-Collective</g-link>, too.
        </p>
      </div>
    </app-section>
  </Layout>
</template>

<script>
import AppSection from '@/components/AppSection'
import FeatureList from '@/components/FeatureList'
import FeatureItem from '@/components/FeatureItem'
// import NewsletterForm from '@/components/NewsletterForm'
import Btn from '~/components/Btn'
import BtnWrapper from '~/components/BtnWrapper'

export default {
  components: {
    AppSection,
    FeatureList,
    FeatureItem,
    // NewsletterForm,
    Btn,
    BtnWrapper,
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
