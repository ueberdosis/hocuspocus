<template>
  <Layout>
    <app-section>
      <VueRemarkContent class="text" />
    </app-section>
    <app-section>
      <page-navigation />
    </app-section>
  </Layout>
</template>

<page-query>
query($path: String!) {
  docPage(path: $path) {
    id
    title
    fileInfo {
      path
    }
  }
}
</page-query>

<script>
import AppSection from '@/components/AppSection'
import PageNavigation from '@/components/PageNavigation'

export default {
  components: {
    AppSection,
    PageNavigation,
  },

  metaInfo() {
    return {
      title: this.$page?.docPage?.title,
      meta: [
        /* OpenGraph */
        {
          property: 'og:title',
          content: this.$page?.docPage?.title,
        },
        {
          property: 'og:image',
          content: 'https://hocuspocus.dev/og-image.png',
        },
        /* Twitter */
        {
          name: 'twitter:title',
          content: this.$page?.docPage?.title,
        },
        {
          name: 'twitter:card',
          content: 'summary_large_image',
        },
        {
          name: 'twitter:image',
          content: 'https://hocuspocus.dev/og-image.png',
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

<style lang="scss" src="./style.scss" scoped></style>
