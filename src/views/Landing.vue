<template>
  <header class="biketag-header">
    <nav class="biketag-header-nav navbar navbar-expand-lg">
      <div class="navbar-brand" @click="toSection('mg-top')">
        <img src="@/assets/images/biketag-logo.svg" class="logo" />
      </div>

      <!-- Hamburger Menu -->
      <button
        ref="buttonCollapse"
        class="navbar-toggler"
        data-bs-toggle="collapse"
        data-bs-target="#navbar-supported-content"
        aria-controls="navbar-supported-content"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <img class="hamburger-image" src="/images/Hamburger.svg" alt="Burge menu" />
      </button>

      <div
        id="navbar-supported-content"
        ref="navList"
        class="collapse navbar-collapse"
        @click="closeMenu"
      >
        <ul class="navbar-nav me-auto mb-lg-0">
          <li class="nav-item" @click="toSection('What is BikeTag?')">What is BikeTag?</li>
          <li class="nav-item" @click="toSection('BikeTag Ambassador program?')">
            {{ $t('BikeTag Ambassadors') }}
          </li>
          <li class="nav-item" @click="toSection('BIKETAG IS AN Open Source Project')">
            {{ $t('Open Source Project') }}
          </li>
        </ul>
      </div>
    </nav>
  </header>
  <div id="mg-top"></div>
  <main>
    <bike-tag-blurb
      title="What is BikeTag?"
      subtitle="BikeTag is a mystery photo tag game played on bicycle"
      :img-src="BikeTagSvg"
      link-text="Support BikeTag"
      link="https://patreon.com/biketag"
      variant="left"
    >
      <p>
        BikeTag is a mystery photo tag game played on bicycles. BikeTag.Org is a place for people to
        see the most recent Bike Tags in their city and participate in the game in an easy and
        simple way, without needing to login to anything. The origins of the game of BikeTag, as far
        as we have been able to track, put the game in Minneapolis, Minnesota, in 2007. BikeTag on
        Reddit was started on in 2011 on /r/BikingATX, that was then adopted by /r/bikeLA, that was
        then adopted by /r/chibike. The game in /r/CyclePDX was created in 2016 and this website was
        created in 2018 as a tool for the game in Portland, Oregon.
      </p>
      <br />
      <p>When using biketag.org, you agree to our Terms Of Service. You can read those here.</p>
    </bike-tag-blurb>
    <bike-tag-blurb
      title="A worldwide game of tag"
      subtitle="Is there a BikeTag Game in your city?"
    >
      <bike-tag-map variant="worldwide" class="worldwide__map mb-5" />
      <bike-tag-games :show-heading="false" />
    </bike-tag-blurb>
    <bike-tag-blurb
      title="BikeTag Ambassador Program"
      subtitle="Start a new game of BikeTag in your area"
      :img-src="BikeTagAmbassadorSvg"
      variant="right"
    >
      <p>
        Our mission is to make the game of BikeTag easy for anyone to play and to support games of
        BikeTag all over the world. To that goal, we created BikeTag.Org and maintain the Open
        Source code that runs the website. We help integrate with existing BikeTag games and we help
        create new ones.
      </p>
      <br />
      <p>
        The BikeTag Ambassador Program connects players of the game with the BikeTag team and gives
        those people access to resources for running games on BikeTag,Org. We provide resources to
        connect with other BikeTag Ambassadors all over the world, and to help you keep the games
        running smoothly.
      </p>
      <br />
      <p>
        Would you like to learn more about the BikeTag Ambassador program and maybe start a new game
        of BikeTag in your area?
        <a href="mailto:hello@biketag.org?subject=BikeTag Ambassador Program">
          Email us at ambassadors@biketag.org!
        </a>
      </p>
    </bike-tag-blurb>
    <bike-tag-blurb
      title="Open Source"
      subtitle="BikeTag is an Open-Source Project Deployed on Netlify "
      img-src="/images/github-netlify.png"
      link-text="Contribute to BikeTag"
      link="https://github.com/KenEucker/biketag-vue/discussions/78"
      variant="left"
    >
      <p>
        This project was started as an open source code repository on GitHub. The entirety of the
        BikeTag platform lives on, there, and you can host/run the software if you are so inclined.
        We also have a developer API that you can use to develop your own version of the BikeTag
        App! Every aspect of the planning, volunteer coordination, software development, design, and
        even stickers goes through the public attribution repository platform that GitHub Provides.
      </p>
    </bike-tag-blurb>
  </main>
  <footer style="background-color: c4c4c4">
    <div class="container">
      <ul>
        <li>
          <a href="https://github.com/KenEucker/biketag-vue/wiki/Privacy-Policy">
            PRIVACY POLICY
          </a>
        </li>
        <li>
          <a href="https://github.com/KenEucker/biketag-vue/wiki/Terms-Of-Service">
            TERMS OF SERVICE
          </a>
        </li>
        <li>
          <a href="https://github.com/KenEucker/biketag-vue/wiki/Code-Of-Conduct">
            CODE OF CONDUCT
          </a>
        </li>
        <li class="nav-item" @click="toSection('FAQS')">FAQS</li>
        <li>
          <a href="mailto:support@biketag.org"> SUPPORT </a>
        </li>
      </ul>
      <!-- <form>
        <span> JOIN OUR MAILING LIST </span>
        <bike-tag-input required />
        <bike-tag-button text="SUBSCRIBE" />
      </form> -->
    </div>
    <div class="img-container">
      <a href=" https://biketag.bike/">
        <img :src="bikeTag" />
      </a>
    </div>
    <p><i>© 2022 BIKE TAG. All Rights Reserved. </i></p>
  </footer>
</template>
<script>
import { defineComponent } from 'vue'
import BikeTagBlurb from '@/components/BikeTagBlurb'
import BikeTagAmbassadorSvg from '@/assets/images/biketag-ambassador.svg'
import BikeTagSvg from '@/assets/images/BikeTag.svg'
import BikeTagGames from '@/components/BikeTagGames.vue'
import BikeTagMap from '@/components/BikeTagMap.vue'

export default defineComponent({
  name: 'HomeView',
  components: {
    BikeTagBlurb,
    BikeTagGames,
    BikeTagMap,
  },
  data() {
    return {
      BikeTagAmbassadorSvg,
      BikeTagSvg,
    }
  },
  methods: {
    toSection(id) {
      document
        .getElementById(id.toLowerCase().replaceAll(' ', '-'))
        .scrollIntoView({ behavior: 'smooth' })
    },
    closeMenu() {
      if (this.$refs['navList'].classList.contains('show')) {
        this.$refs['navList'].classList.remove('show')
      }
    },
  },
})
</script>
<style lang="scss">
main {
  section {
    margin-bottom: 1.5rem;
  }

  #open-source {
    .img-container img {
      width: 80% !important;
      max-width: 280px;
    }
  }
}

footer {
  form {
    .biketag__button {
      height: 3rem;

      .biketag__text {
        .biketag__text--inner {
          font-size: 0.8rem !important;
          line-height: 1;
        }
      }
    }
  }
}
</style>
<style lang="scss" scoped>
@import '../assets/styles/style';

#mg-top {
  height: calc(113px + 2rem);
}

header {
  box-shadow: 0 3px 6px rgb(0 0 0 / 16%), 0 3px 6px rgb(0 0 0 / 23%);
  position: fixed;
  background-color: #e5e5e5;
  width: 100%;
  height: 113px;
  top: 0;
  left: 0;
  z-index: 100;

  nav {
    width: 100%;
    height: inherit;
    margin: auto;
    justify-content: space-between;

    .navbar-brand,
    .navbar-toggler {
      cursor: pointer;
      padding: 1rem;
    }

    #navbar-supported-content {
      flex-grow: unset;
    }

    .navbar-nav {
      align-items: unset;
      height: 100vh;

      .nav-item {
        background-color: #e5e5e5;
        font-family: $default-secondary-font-family;
        text-transform: uppercase;
        box-shadow: 0 1px 3px rgb(0 0 0 / 12%), 0 1px 2px rgb(0 0 0 / 24%);
        border-bottom: 1px solid black;
        padding: 1rem 0;
        font-size: 2rem;
        cursor: pointer;
      }
    }
    @media (min-width: 992px) {
      width: 90%;

      .navbar-brand,
      .navbar-toggler {
        padding: 0;
      }

      .navbar-nav {
        align-items: unset;
        height: inherit;

        .nav-item {
          font-size: 1rem;
          margin: 0 1rem !important;
          box-shadow: unset;
          border-bottom: unset;
        }
      }
    }
  }
}

main {
  min-height: 100%;
  margin-bottom: calc(-520px - 1rem);

  &::after {
    content: '';
    display: block;
  }
}

footer,
main::after {
  height: calc(520px + 1rem);
}

footer {
  padding-top: 1rem;
  position: relative;
  bottom: 0;
  background-color: #696969;

  .container {
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: $default-secondary-font-family;
    text-transform: uppercase;
    flex-flow: column nowrap;

    li {
      list-style: none;

      a {
        text-decoration: none;
      }
    }

    form {
      margin: 1rem;
    }
  }

  .img-container {
    width: 50vw;
    margin: auto;

    img {
      height: 150px;
    }
  }

  p {
    position: absolute;
    bottom: 0;
    width: 100%;
  }

  ul {
    padding: 0;
  }

  .worldwide {
    &__map {
      width: 100%;
    }
  }

  @media (min-width: 780px) {
    display: flex;
    flex-flow: row-reverse nowrap;

    p {
      margin: 0;
      padding-left: 1rem;
      text-align: left;
    }

    .container {
      flex-flow: row nowrap;
      justify-content: flex-end;

      ul {
        margin-top: 1rem;
        padding: 0;
        display: flex;
        align-self: flex-start;

        li {
          margin: 1rem;
        }
      }
    }
  }
}
@media (min-width: 780px) {
  main {
    margin-bottom: calc(-220px - 1rem);
  }

  footer,
  main::after {
    height: calc(250px + 1rem);
  }
}
</style>
