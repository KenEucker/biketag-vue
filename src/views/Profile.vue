<template>
  <loading v-if="tagsAreLoading" v-model:active="tagsAreLoading" :is-full-page="true">
    <img class="spinner" src="../assets/images/SpinningBikeV1.svg" />
  </loading>
  <div class="container mb-5 mt-5">
    <div class="center-cnt">
      <div class="profile-picture">
        <img class="player-avatar" :src="player.picture" :alt="getProfile?.name" />
        <div class="picture-outline">
          <bike-tag-button variant="circle-clean"> </bike-tag-button>
        </div>
      </div>
      <div class="flx-columns mt-5">
        <span class="player-name mb-5 mt-3"> {{ getProfile?.name }} </span>
        <div v-if="getProfile?.user_metadata">
          <span
            v-for="(social, i) in Object.keys(getProfile?.user_metadata).filter(
              (key) =>
                getProfile?.user_metadata[key] != null && getProfile?.user_metadata[key].length > 0
            )"
            :key="i"
            class="player-name mt-4"
            style="font-size: 2.5rem"
          >
            {{ getProfile?.user_metadata[social] }}
          </span>
        </div>
      </div>
    </div>
    <div class="container mt-5 col-md-8 col-lg-8">
      <form
        ref="setProfile"
        class="mt-5 mb-2"
        name="profile-update"
        action="profile-update"
        method="POST"
        data-netlify="true"
        data-netlify-honeypot="bot-field"
        @submit.prevent="onSubmit"
      >
        <div v-if="!isBikeTagAmbassador" class="mt-3">
          <bike-tag-input
            id="name"
            v-model="name"
            name="name"
            :placeholder="getProfile?.name || 'Your new name'"
          />
        </div>
        <div v-for="(social, i) in socialNetworkIcons" :key="i" class="mt-3 input-icon">
          <bike-tag-input
            :id="social[0]"
            v-model="$data[social[0]]"
            :name="social[0]"
            :placeholder="
              (getProfile?.user_metadata?.length > i && getProfile?.user_metadata[i]) ||
              `${social[0].charAt(0).toUpperCase() + social[0].slice(1)} player name`
            "
          >
            <div class="icon-cnt">
              <img :id="social[0]" class="icon" :src="social[1]" @click="$refs.file.click()" />
            </div>
          </bike-tag-input>
        </div>
        <template v-if="isBikeTagAmbassador">
          <template v-if="showImgur">
            <div class="input-block mt-3">
              <bike-tag-button
                variant="medium"
                text="Imgur Configuaration"
                @click.prevent="() => toggleShowFields('showImgur')"
              />
              <bike-tag-input
                v-model="imgurConfig.clientId"
                name="Imgur Client Id"
                label="Client Id"
                placeholder="Imgur Client Id"
                type="password"
              />
              <bike-tag-input
                v-model="imgurConfig.clientSecret"
                name="Imgur Client Secret"
                label="Client Secret"
                placeholder="Imgur Client Secret"
                type="password"
              />
              <bike-tag-input
                v-model="imgurConfig.refreshToken"
                name="Imgur Refresh Token"
                label="Refresh Token"
                placeholder="Imgur Refresh Token"
                type="password"
              />
            </div>
          </template>
          <template v-if="showSanity">
            <div class="input-block mt-3">
              <bike-tag-button
                variant="medium"
                text="Sanity Configuaration"
                @click.prevent="() => toggleShowFields('showSanity')"
              />
              <bike-tag-input
                v-model="sanityConfig.projectId"
                name="Sanity Project Id"
                label="Project Id"
                placeholder="Sanity Project Id"
                type="password"
              />
              <bike-tag-input
                v-model="sanityConfig.dataset"
                name="Sanity Dataset"
                label="Dataset"
                placeholder="Sanity Dataset"
                type="password"
              />
            </div>
          </template>
          <template v-if="showReddit">
            <div class="input-block mt-3">
              <bike-tag-button
                variant="medium"
                text="Reddit Configuaration"
                @click.prevent="() => toggleShowFields('showReddit')"
              />
              <bike-tag-input
                v-model="redditConfig.redditClientId"
                name="Reddit Client Id"
                label="Cliend Id"
                placeholder="Reddit Client Id"
                type="password"
              />
              <bike-tag-input
                v-model="redditConfig.clientSecret"
                name="Reddit Client Secret"
                label="Client Secret"
                placeholder="Reddit Client Secret"
                type="password"
              />
              <bike-tag-input
                v-model="redditConfig.userName"
                name="Reddit User Name"
                label="User Name"
                placeholder="Reddit User Name"
              />
              <bike-tag-input
                v-model="redditConfig.password"
                name="Reddit Password"
                label="Password"
                placeholder="Reddit Password"
                type="password"
              />
            </div>
          </template>
          <bike-tag-button
            v-if="!showImgur"
            variant="medium"
            text="+ Igmur Config"
            @click.prevent="() => toggleShowFields('showImgur')"
          />
          <bike-tag-button
            v-if="!showSanity"
            variant="medium"
            text="+ Sanity Config"
            @click.prevent="() => toggleShowFields('showSanity')"
          />
          <bike-tag-button
            v-if="!showReddit"
            variant="medium"
            text="+ Reddit Config"
            @click.prevent="() => toggleShowFields('showReddit')"
          />
        </template>
        <bike-tag-button variant="medium" text="Save Changes" @click="onSubmit" />
      </form>
    </div>
    <div v-if="player.tags" class="d-flex justify-content-center mt-5 mb-5">
      <player size="lg" :player="player" :no-link="true" />
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
import Player from '@/components/PlayerBicon.vue'

export default defineComponent({
  name: 'ProfileView',
  components: {
    Loading,
    BikeTagButton,
    BikeTagInput,
    Player,
  },
  data() {
    return {
      name: null,
      reddit: null,
      instagram: null,
      twitter: null,
      imgur: null,
      discord: null,
      socialNetworkIcons: [
        ['reddit', Reddit],
        ['instagram', Instagram],
        ['twitter', Twitter],
        ['imgur', Imgur],
        ['discord', Discord],
      ],
      imgurConfig: {},
      sanityConfig: {},
      redditConfig: {},
      showImgur: false,
      showSanity: false,
      showReddit: false,
    }
  },
  computed: {
    ...mapGetters(['getPlayers', 'getProfile', 'isBikeTagAmbassador']),
    player() {
      const playerList = this.getPlayers?.filter((player) => {
        return this.$auth.user.name == decodeURIComponent(encodeURIComponent(player.name))
      })
      return {
        ...playerList[0],
        name: this.getProfile?.name,
        picture: this.getProfile?.picture ?? this.$auth.user.picture,
        user_metadata: this.getProfile?.user_metadata ?? {},
      }
    },
    authLoading() {
      return typeof this.$auth !== 'undefined' && this.$auth?.loading && !this.$auth.loading.value
    },
  },
  async mounted() {
    await this.$store.dispatch('setTags')
    await this.$store.dispatch('setPlayers')

    if (this.isBikeTagAmbassador) {
      const credentials = this.player.user_metadata.credentials ?? {}
      if (credentials.imgur) {
        this.imgurConfig = { ...credentials.imgur }
      } else {
        this.imgurConfig = {
          clientId: '',
          clientSecret: '',
          refreshToken: '',
        }
      }
      if (credentials.sanity) {
        this.sanityConfig = { ...credentials.sanity }
      } else {
        this.sanityConfig = {
          projectId: '',
          dataset: '',
        }
      }
      if (credentials.reddit) {
        this.redditConfig = { ...credentials.reddit }
      } else {
        this.redditConfig = {
          clientId: '',
          clientSecret: '',
          userName: '',
          password: '',
        }
      }
    }
  },
  methods: {
    toggleShowFields(name) {
      this[name] = !this[name]
    },
    async onSubmit() {
      console.log('submitted')
      return
      const token = (await this.$auth.getIdTokenClaims()).__raw
      const user_metadata = {
        social: {
          reddit: this.reddit,
          instagram: this.instagram,
          twitter: this.twitter,
          imgur: this.imgur,
          discord: this.discord,
        },
      }
      if (this.isBikeTagAmbassador) {
        user_metadata['credentials'] = {
          imgur: this.imgurConfig,
          sanity: this.sanityConfig,
          reddit: this.reddit,
        }
      }
      await this.$store.dispatch('updateProfile', {
        name: this.name != null && this.name.length > 0 ? this.name : this.getProfile?.name,
        user_metadata,
        token,
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

.input-block {
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
