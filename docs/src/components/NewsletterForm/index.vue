<template>
  <form class="newsletter-form" @submit.prevent="onSubmit">
    <div class="newsletter-form__content">
      <input
        class="newsletter-form__input"
        type="email"
        v-model="email"
        placeholder="Your email address"
      >
      <button
        class="newsletter-form__button"
        :disabled="loading"
        type="submit"
      >
        {{ buttonLabel }}
      </button>
    </div>
    <div class="newsletter-form__error" v-if="error">
      {{ error }}
    </div>
    <div class="newsletter-form__success" v-if="success">
      To complete the subscription process, please click the link in the email we just sent you.
    </div>
  </form>
</template>

<script>
import axios from 'axios'

export default {
  props: {
    id: {
      required: true,
      type: String,
    },

    buttonLabel: {
      default: 'Subscribe',
      type: String,
    },
  },

  data() {
    return {
      email: null,
      error: null,
      success: false,
      loading: false,
    }
  },

  methods: {
    onSubmit() {
      if (this.loading || !this.email) {
        return
      }

      this.loading = true

      axios
        .post(`https://mailing.ueberdosis.io/api/subscribe/${this.id}`, {
          email: this.email,
        })
        .then(() => {
          this.email = null
          this.success = true
          this.error = null
          this.loading = false
        })
        .catch(error => {
          this.success = false
          this.error = error?.response?.data?.errors?.email?.[0] || error?.response?.data?.message
          this.loading = false
        })
    },
  },
}
</script>

<style lang="scss" src="./style.scss" scoped></style>
