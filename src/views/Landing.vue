<template>
    <bike-tag-blurb title="What is BikeTag?" 
      subtitle="BikeTag is a mystery photo tag game played on bicycle"
      :imgSrc="bikeTag" variant="left"
      >
      <p>
        BikeTag is a mystery photo tag game played on bicycles. 
        BikeTag.Org is a place for people to see the most recent Bike Tags in their city and participate in the game in an easy and simple way, without needing to login to anything. 
        The origins of the game of BikeTag, as far as we have been able to track, put the game in Minneapolis, Minnesota, in 2007. 
        BikeTag on Reddit was started on in 2011 on /r/BikingATX, that was then adopted by /r/bikeLA, that was then adopted by /r/chibike. 
        The game in /r/CyclePDX was created in 2016 and this website was created in 2018 as a tool for the game in Portland, Oregon.
      </p> <br />
      <p>
        When using biketag.org, you agree to our Terms Of Service. You can read those here.
      </p> <br />
      <p>
        <b> Support the BikeTag Project on Patreon </b>
      </p>
    </bike-tag-blurb>
    <bike-tag-blurb title="BikeTag Ambassador program?" 
      subtitle="Start a new game of BikeTag in your area"
      link="/about"
      :imgSrc="bikeTagAmabassadorSvg"
      >
      <p>
        Our mission is to make the game of BikeTag easy for anyone to play and to support games of BikeTag all over the world. 
        To that goal, we created BikeTag.Org and maintain the Open Source code that runs the website. We help integrate with existing BikeTag games and we help create new ones.
      </p> <br />
      <p>
        The BikeTag Ambassador Program connects players of the game with the BikeTag team and gives those people access to resources for running games on BikeTag,Org. 
        We provide resources to connect with other BikeTag Ambassadors all over the world, and to help you keep the games running smoothly.
      </p> <br />
      <p>
        Would you like to learn more about the BikeTag Ambassador program and maybe start a new game of BikeTag in your area?
      <a href="mailto://ambassadors@biketag.org"> Email us at ambassadors@biketag.org! </a>
      </p>
    </bike-tag-blurb>
    <bike-tag-blurb title="BIKETAG IS AN Open Source Project" 
      subtitle="Deployed on Netlify "
      :imgSrc="netlifyLogoDark" variant="left"
      >
      <p>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum suscipit mi ut aenean. Non sodales pellentesque ac ultrices. Mauris vitae, a a blandit nunc eu egestas. Nisl in dui, at quisque est. Duis nec quam rhoncus elit. Netus dolor eu, sit sit. Pharetra quisque ornare amet cursus suspendisse leo. Ultrices dignissim   
      </p> <br />
      <p>
        <b>> Contribute to BikeTag</b>
      </p>
    </bike-tag-blurb>
</template>
<script>
import { defineComponent } from 'vue'
import BikeTagBlurb from '@/components/BikeTagBlurb'
import BikeTagAmbassador from "@/assets/images/biketag-ambassador.svg"
import BikeTag from "@/assets/images/BikeTag.svg"
import NetlifyLogoDark from "@/assets/images/netlify-logo-dark.svg"

export default defineComponent({
  name: "HomeView",
  components: {
    BikeTagBlurb,
  },
  data() {
    return {
      bikeTagAmabassadorSvg: BikeTagAmbassador,
      bikeTag: BikeTag,
      netlifyLogoDark: NetlifyLogoDark,
    }
  },
})
</script>
