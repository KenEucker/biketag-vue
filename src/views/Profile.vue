<template>
  <loading v-if="tagsAreLoading" v-model:active="tagsAreLoading" :is-full-page="true">
    <img class="spinner" src="../assets/images/SpinningBikeV1.svg" />
  </loading>
  <div class="container mb-5 mt-5">
    <div class="center-cnt">
      <div class="profile-picture">
        <img class="player-avatar" :src="getUser.picture" :alt="getUser.name" />
        <div class="picture-outline">
          <bike-tag-button variant="circle-clean"> </bike-tag-button>
        </div>
      </div>
      <div class="flx-columns mt-5">
        <span class="player-name mb-5 mt-3"> {{ getUser.name }} </span>
        <div v-if="getUser.user_metadata">
          <span
            v-for="(social, i) in Object.keys(getUser.user_metadata).filter(
              (key) => getUser.user_metadata[key] != null && getUser.user_metadata[key].length > 0
            )"
            :key="i"
            class="player-name mt-4"
            style="font-size: 2.5rem"
          >
            {{ social }}
          </span>
        </div>
      </div>
    </div>
    <div class="container mt-5 col-md-8 col-lg-8">
      <form
        ref="setUser"
        class="mt-5 mb-2"
        name="profile-update"
        action="profile-update"
        method="POST"
        data-netlify="true"
        data-netlify-honeypot="bot-field"
        @submit.prevent="onSubmit"
      >
        <div class="mt-3">
          <bike-tag-input
            id="name"
            v-model="name"
            name="name"
            :placeholder="getUser.name || 'Your new name'"
          />
        </div>
        <div v-for="(social, i) in socialNetworks" :key="i" class="mt-3 input-icon">
          <bike-tag-input
            :id="social[0]"
            v-model="$data[social[0]]"
            :name="social[0]"
            :placeholder="
              (getUser.user_metadata?.length > i && getUser.user_metadata[i]) ||
              `${social[0].charAt(0).toUpperCase() + social[0].slice(1)} user name`
            "
          >
            <div class="icon-cnt">
              <img :id="social[0]" class="icon" :src="social[1]" @click="$refs.file.click()" />
            </div>
          </bike-tag-input>
        </div>

        <bike-tag-button variant="medium" text="Save Changes" @click="onSubmit" />
      </form>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'
import BikeTagButton from '@/components/BikeTagButton.vue'
import BikeTagInput from '@/components/BikeTagInput.vue'
import Loading from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/vue-loading.css'
import Reddit from '@/assets/images/Reddit.svg'
import Instagram from '@/assets/images/Instagram.svg'
import Twitter from '@/assets/images/Twitter.svg'
import Imgur from '@/assets/images/Imgur.svg'
import Discord from '@/assets/images/Discord.svg'

export default defineComponent({
  name: 'PlayerView',
  components: {
    Loading,
    BikeTagButton,
    BikeTagInput,
  },
  data() {
    return {
      name: null,
      reddit: null,
      instagram: null,
      twitter: null,
      imgur: null,
      discord: null,
      socialNetworks: [
        ['reddit', Reddit],
        ['instagram', Instagram],
        ['twitter', Twitter],
        ['imgur', Imgur],
        ['discord', Discord],
      ],
    }
  },
  computed: {
    ...mapGetters(['getPlayers', 'getUser']),
    player() {
      const playerList = this.getPlayers?.filter((player) => {
        return this.$auth.user.name == player.name
      })
      return {
        ...playerList[0],
        name: this.getUser.name,
        picture: this.getUser.picture,
        user_metadata: this.getUser.user_metadata ?? {},
      }
    },
  },
  async mounted() {
    await this.$store.dispatch('setTags')
    await this.$store.dispatch('setPlayers')
  },
  methods: {
    toggleForm() {
      this.showForm = !this.showForm
    },
    async onSubmit(e) {
      const token = (await this.$auth.getIdTokenClaims()).__raw
      await this.$store.dispatch('updateProfile', {
        name: this.name != null && this.name.length > 0 
                ? this.name 
                : getUser.name,
        user_metadata: {
          social: this.socialNetworks.filter(value => $data[value[0]] != null && $data[value[0]].length > 0)
                                      .map(value => $data[value[0]]),
        },
        token
      })
    },
  },
})
</script>
<style lang="scss">
.flx-columns {
  @include flx-center($flow: column nowrap, $al: flex-start);

  .scribble-button {
    .scribble-text--inner {
      font-size: 1.5rem !important;
    }
  }
}

.input-icon {
  .biketag-input {
    input {
      z-index: 2;

      &:focus {
        background-color: transparent !important;
      }
    }
  }
}
</style>
<style lang="scss" scoped>
.icon-cnt {
  width: 100%;
  justify-content: flex-end;
  display: flex;
  position: absolute;
  top: 30%;
  padding-right: 1.5rem;

  #imgur {
    margin-top: 0.5rem;
  }

  .icon {
    max-width: 40px;
    z-index: 1;
  }
}

.center-cnt {
  @include flx-center($flow: column nowrap);

  max-width: 800px;
  margin: auto;

  @media (min-width: 600px) {
    flex-flow: row nowrap;

    .player-name {
      margin-top: 0;
    }
  }

  .profile-picture {
    position: relative;
    width: 185px;

    .picture-outline {
      width: 185px;
      height: 190px;
      position: absolute;
      top: -1rem;
      left: 0;

      .scribble-button {
        width: inherit;
        height: inherit;
      }
    }

    img {
      position: relative;
    }
  }

  .player-avatar {
    clip-path: circle(50%);
    min-width: 150px;
  }

  .player-name {
    // line-height: unset!important;
    text-shadow: 3px -2px 3px #292828e6;
    filter: invert(1) drop-shadow(2px 4px 6px white);
    animation: fadeIn 2s;
  }
}
</style>
