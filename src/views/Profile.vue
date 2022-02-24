<template>
  <loading v-if="tagsAreLoading" v-model:active="tagsAreLoading" :is-full-page="true">
    <img class="spinner" src="../assets/images/SpinningBikeV1.svg" />
  </loading>
  <div class="container mb-5 mt-5">
    <div class="center-cnt">
      <div class="profile-picture">
        <img class="player-avatar" :src="player.picture" :alt="player.name" />
        <div class="picture-outline">
          <bike-tag-button variant="circle-clean">
          </bike-tag-button>
        </div>
      </div>
      <div class="flx-columns mt-5">
        <span class="player-name mb-5 mt-3"> {{ player.name }} </span>
        <span class="player-name mt-4" style="font-size : 2.5rem" 
          v-for="social, i in player.metadata.filter(value => value.length > 0)" 
          :key="i"> {{ social }} </span>
      </div>
    </div>
    <div class="container mt-5 col-md-8 col-lg-8">
      <form class="mt-5 mb-2" 
        ref="profileUpdate"
        name="profile-update"
        action="profile-update"
        method="POST"
        data-netlify="true"
        data-netlify-honeypot="bot-field"
        @submit.prevent="onSubmit">
        <div class="mt-3">
            <bike-tag-input
            id="name"
            v-model="name"
            name="name"
            :placeholder="player.name || 'Your new name'"
          />
        </div>
        <div class="mt-3 input-icon" v-for="social, i in socialNetworks" :key="i">
            <bike-tag-input
            :id="social[0]"
            v-model="$data[social[0]]"
            :name="social[0]"
            :placeholder="(player.metadata.length > i && player.metadata[i]) || 
              `${social[0].charAt(0).toUpperCase() + social[0].slice(1)} user name`"
          >
            <div class="icon-cnt">
              <img
                :id="social[0]"
                class="icon"
                :src="social[1]"
                @click="$refs.file.click()"
              />
            </div>
          </bike-tag-input>
        </div>

        <bike-tag-button @click="onSubmit" variant="medium" text="Save Changes" />
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
import Reddit from "@/assets/images/Reddit.svg"
import Instagram from "@/assets/images/Instagram.svg"
import Twitter from "@/assets/images/Twitter.svg"
import Imgur from "@/assets/images/Imgur.svg"
import Discord from "@/assets/images/Discord.svg"

export default defineComponent({
  name: 'PlayerView',
  components: {
    Loading,
    BikeTagButton,
    BikeTagInput
  },
  data() {
    return {
      name : null,
      reddit : null,
      instagram : null,
      twitter : null,
      imgur : null,
      discord : null,
      socialNetworks : [
        ['reddit', Reddit], ['instagram', Instagram], ['twitter', Twitter], ['imgur', Imgur],
        ['discord', Discord]
      ]
    }
  },
  computed: {
    ...mapGetters(['getPlayers', 'getUser']),
    player() {
      const playerList = this.getPlayers.filter((player) => {
        return this.$auth.user.name == player.name
      })
      return {
        ...playerList[0], 
        name: this.getUser.name || this.$auth.user.name, 
        picture: this.$auth.user.picture,
        metadata: this.getUser.metadata || this.$auth.user.metadata || []
      }
    },
  },
  async mounted() {
    await this.$store.dispatch('setTags')
    await this.$store.dispatch('setPlayers')
  },
  methods: {
    toggleForm(){
      this.showForm = !this.showForm
    },
    async onSubmit(e){
      // e.preventDefault()
      // const formAction = this.$refs.profileUpdate.getAttribute('action')
      // const formData = new FormData(this.$refs.profileUpdate)
      //user_id = (await this.$auth.getIdTokenClaims()).sub
      //raw_token = (await this.$auth.getIdTokenClaims())._raw

      await this.$store.dispatch("profileUpdate", 
        {
          name : this.name, 
          metadata : this.socialNetworks
              .map((value, i) => this.$data[value[0]] != null && this.$data[value[0]].length > 0 ?
                      this.$data[value[0]] : (
                        this.player.metadata.length > i ? 
                                this.player.metadata[i] :
                                null
              ))
        })
    },
  },
})
</script>
<style lang="scss">
.flx-columns {
  @include flx-center($flow : column nowrap, $al: flex-start);
  .scribble-button{
    .scribble-text--inner {
      font-size: 1.5rem!important;
    }
  }
}
.input-icon {
  .biketag-input {
    input {
      z-index: 2;
      &:focus {
        background-color: transparent!important;
      }
    }
  }
}
</style>
<style lang="scss" scoped>
.icon-cnt{
  width: 100%;
  justify-content: flex-end;
  display: flex;
  position: absolute;
  top: 30%;
  padding-right: 1.5rem;
  #imgur {
    margin-top: 0.5rem
  }
  .icon {
    max-width: 40px;
    z-index: 1;
  }
}
.center-cnt {
  @include flx-center($flow : column nowrap);
  max-width: 800px;
  margin: auto;

  @media (min-width: 600px) {
    flex-flow: row nowrap;
    .player-name {
      margin-top: 0
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
      left: 0rem;

      .scribble-button{
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