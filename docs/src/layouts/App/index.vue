<template>
  <div class="app">
    <div class="app__sidebar">
      <div class="app__title">
        <g-link class="app__name" to="/">
          {{ $static.metadata.siteName }}
        </g-link>
      </div>

      <portal-target name="desktop-nav" />
    </div>

    <div class="app__content">
      <div class="app__top-bar">
        <div class="app__inner app__top-bar-inner">
          <!-- <div class="app__search">
            <div class="app__search-button" />
            <div class="app__search-docsearch" />
          </div> -->
          <button
            class="app__menu-icon"
            @click="menuIsVisible = true"
            v-if="!menuIsVisible"
          >
            <icon name="menu" />
          </button>
          <button
            class="app__close-icon"
            @click="menuIsVisible = false"
            v-if="menuIsVisible"
          >
            <icon name="close" />
          </button>
        </div>
        <div class="app__mobile-nav" v-if="menuIsVisible">
          <portal-target name="mobile-nav" />
        </div>
      </div>
      <main class="app__main">
        <div class="app__inner">
          <slot />
        </div>
      </main>
      <div class="app__page-navigation">
        <div class="app__inner">
          <page-navigation />
        </div>
      </div>
      <div class="app__page-footer">
        <div class="app__inner">
          <a href="/impressum">Impressum</a>
          &middot;
          <a href="/privacy-policy">Privacy Policy</a>
          &middot;
          Made with 🖤 by <a href="https://twitter.com/_ueberdosis">überdosis</a>
        </div>
      </div>
    </div>

    <portal :to="portal">
      <nav class="app__navigation">
        <div class="app__link-group" v-for="(linkGroup, i) in linkGroups" :key="i">
          <div class="app__link-group-title">
            {{ linkGroup.title }}
          </div>
          <ul class="app__link-list">
            <li v-for="(item, j) in linkGroup.items" :key="j">
              <g-link
                :class="{
                  'app__link': true,
                  'app__link--exact': $router.currentRoute.path === item.link,
                  'app__link--active': $router.currentRoute.path.startsWith(item.link),
                  'app__link--draft': item.draft === true,
                  'app__link--pro': item.pro === true,
                  'app__link--new': item.new === true,
                  'app__link--with-children': !!item.items
                }"
                :to="item.redirect || item.link"
              >
                {{ item.title }}
              </g-link>

              <ul v-if="item.items" class="app__link-list">
                <li v-for="(item, k) in item.items" :key="k">
                  <g-link
                    :class="{
                      'app__link': true,
                      'app__link--exact': $router.currentRoute.path === item.link,
                      'app__link--active': $router.currentRoute.path.startsWith(item.link),
                      'app__link--draft': item.draft === true,
                      'app__link--pro': item.pro === true,
                      'app__link--new': item.new === true,
                    }"
                    :to="item.link"
                    exact
                  >
                    {{ item.title }}
                  </g-link>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </nav>
    </portal>
  </div>
</template>

<static-query>
query {
  metadata {
    siteName
  }
}
</static-query>

<script>
import linkGroups from '@/links.yaml'
import Icon from '@/components/Icon'
import PageNavigation from '@/components/PageNavigation'
// import GithubButton from 'vue-github-button'

export default {
  components: {
    Icon,
    PageNavigation,
    // GithubButton,
  },

  data() {
    return {
      linkGroups,
      menuIsVisible: false,
      windowWidth: null,
    }
  },

  computed: {
    portal() {
      if (this.windowWidth && this.windowWidth < 800) {
        return 'mobile-nav'
      }

      return 'desktop-nav'
    },

    currentPath() {
      return this.$route.matched[0].path
    },

    editLink() {
      const { currentPath } = this
      const filePath = currentPath === '' ? '/introduction' : currentPath

      if (process.env.NODE_ENV === 'development') {
        return `vscode://file${this.cwd}/src/docPages${filePath}.md`
      }

      return `https://github.com/ueberdosis/tiptap-next/blob/main/docs/src/docPages${filePath}.md`
    },
  },

  watch: {
    $route() {
      this.menuIsVisible = false
    },
  },

  methods: {
    initSearch() {
      // eslint-disable-next-line
      docsearch({
        apiKey: '1abe7fb0f0dac150d0e963d2eda930fe',
        indexName: 'ueberdosis_tiptap',
        container: '.app__search-docsearch',
        debug: false,
      })
    },

    handleResize() {
      this.windowWidth = window.innerWidth
    },
  },

  mounted() {
    // this.initSearch()
    this.handleResize()

    window.addEventListener('resize', this.handleResize)
  },

  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize)
  },
}
</script>

<style lang="scss" src="./fonts.scss"></style>
<style lang="scss" src="./base.scss"></style>
<style lang="scss" src="./prism.scss"></style>
<style lang="scss" src="./style.scss" scoped></style>
