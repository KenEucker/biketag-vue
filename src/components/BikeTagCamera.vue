<template>
  <!-- https://dev.to/bryce/bringing-the-css-only-polaroid-camera-to-life-2881 -->
  <div ref="cameraRef" class="camera">
    <div class="camera__top">
      <div ref="flashOverlayRef" class="flash-overlay"></div>
      <div class="camera__top__flash"></div>
      <div
        ref="timerRef"
        class="camera__top__timer clickable"
        @mousedown="onTouchTimerStart"
        @mouseup="onTouchTimerStop"
      ></div>
      <div class="sensor"></div>
      <div ref="lensRef" class="camera__top__lens">
        <div class="glass no-clickable"></div>
      </div>
      <div
        ref="shutterRef"
        :class="`camera__top__shutter clickable transition ${
          state.isFlashing ? 'shutter-clicked' : ''
        }`"
        @mousedown="onTouchShutterStart"
        @mouseup="onTouchShutterStop"
      ></div>
      <div class="viewfinder">
        <div ref="glassRef" class="glass">
          <div class="back"></div>
        </div>
      </div>
      <div class="size-toggle-container">
        <div
          ref="sizeToggleRef"
          class="toggle clickable transition lighten"
          @mousedown="sizeToggleClick"
        ></div>
      </div>
      <div class="power"></div>
      <div class="title"></div>
    </div>
    <div class="camera__bottom">
      <div class="tag-toggle-container">
        <div class="toggle clickable" @mousedown="onClickFilmDoor">
          <div ref="tagToggleRef" class="handle"></div>
        </div>
      </div>
      <div class="camera__bottom__printer"></div>
      <div class="camera__bottom__labels">
        <div class="rainbow"></div>
        <div class="logo">Polaroid</div>
        <div class="type"></div>
      </div>
    </div>
  </div>
  <div ref="backroundContainerRef" class="background-container">
    <div ref="backgroundRef" class="background-image transition"></div>
  </div>
</template>
<script>
import { defineComponent } from 'vue'
import { exportHtmlToDownload } from '@/common/utils'

export default defineComponent({
  name: 'BikeTagCamera',
  props: {
    title: {
      type: String,
      default: '',
    },
    subtitle: {
      type: String,
      default: '',
    },
    tag: {
      type: Object,
      default: () => {
        return {}
      },
    },
  },
  data() {
    console.log('data')
    return {
      animationDuration: 400,
      enableCSSFilters: true,

      state: {
        currentAngle: 0,
        backgroundOpacity: 1,
        backgroundColor: '#fff',
        isFlashing: false,
        backgroundFilters: {
          brightness: 100,
          contrast: 100,
          blur: 0,
        },
      },
    }
  },
  mounted() {
    // Lock background on mobile
    if (/Mobi/.test(navigator.userAgent)) {
      this.$refs.backgroundRef.style.backgroundSize = 'cover'
    }
    document.addEventListener('mouseup', this.onTouchTimerStop)
    document.addEventListener('mouseup', this.onTouchShutterStop)
  },
  methods: {
    async downloadTag() {
      this.downloadingTag = true
      const downloadPrefix = `BikeTag-${this.getGameName}-${this.tagnumber}--`
      const foundImageDataUrl = await exportHtmlToDownload(
        `${downloadPrefix}found`,
        undefined,
        '#the-tag .found-tag'
      )
      const mysteryImageDataUrl = await exportHtmlToDownload(
        `${downloadPrefix}mystery`,
        undefined,
        '#the-tag .mystery-tag'
      )
      this.downloadingTag = false
    },

    /* Film Door */
    onClickFilmDoor() {
      const resetTransform = this.$refs.tagToggleRef.style.transform

      if (resetTransform) {
        this.$refs.tagToggleRef.style.transform = ''
      } else {
        this.$refs.tagToggleRef.style.transform = 'translate(-80px)'
      }
    },

    /* Lighten/Darken */
    formatBackgroundFilters() {
      const units = {
        brightness: '%',
        contrast: '%',
        blur: 'px',
      }

      return Object.keys(this.state.backgroundFilters)
        .map((filter) => `${filter}(${this.state.backgroundFilters[filter]}${units[filter]})`)
        .join(' ')
    },

    sizeToggleClick() {
      const resetTransform = this.$refs.sizeToggleRef.style.transform

      if (resetTransform) {
        this.$refs.sizeToggleRef.style.transform = ''
        this.state.backgroundOpacity = 1
        if (this.enableCSSFilters) {
          this.state.backgroundFilters.brightness = 100
          this.state.backgroundFilters.contrast = 100
        }
      } else if (this.$refs.sizeToggleRef.classList.contains('lighten')) {
        this.$refs.sizeToggleRef.style.transform = 'translateX(15px)'
        this.$refs.sizeToggleRef.classList.remove('lighten')
        if (this.enableCSSFilters) {
          this.state.backgroundFilters.brightness = 110
          this.state.backgroundFilters.contrast = 90
        } else {
          this.state.backgroundOpacity = 0.9
          this.state.backgroundColor = '#fff'
        }
      } else {
        this.$refs.sizeToggleRef.style.transform = 'translate(-15px)'
        this.$refs.sizeToggleRef.classList.add('lighten')
        if (this.enableCSSFilters) {
          this.state.backgroundFilters.brightness = 90
          this.state.backgroundFilters.contrast = 110
        } else {
          this.state.backgroundOpacity = 0.9
          this.state.backgroundColor = '#000'
        }
      }

      if (this.enableCSSFilters) {
        this.$refs.backgroundRef.style.filter = this.formatBackgroundFilters()
      } else {
        this.$refs.backgroundRef.style.opacity = this.state.backgroundOpacity
        this.$refs.backroundContainerRef.style.backgroundColor = this.state.backgroundColor
      }
    },

    /* Shutter */
    onTouchShutterStart(e) {
      if (!this.state.isFlashing) {
        this.state.isFlashing = true
        this.$refs.backroundContainerRef.style.backgroundColor = '#fff'
        this.$refs.flashOverlayRef.style.opacity = 1
        this.$refs.backgroundRef.style.opacity = 0.75

        setTimeout(() => {
          this.$refs.flashOverlayRef.style.transition = `opacity ${
            this.animationDuration * 2
          }ms ease-out`
          this.$refs.backgroundRef.style.transition = `opacity ${
            this.animationDuration * 2
          }ms ease-out`
          this.$refs.flashOverlayRef.style.opacity = 0
          this.$refs.backgroundRef.style.opacity = 1
        }, 0)

        setTimeout(() => {
          this.state.isFlashing = false
          this.$refs.flashOverlayRef.style.transition = ''
          this.$refs.backgroundRef.style.transition = ''
          this.$refs.backroundContainerRef.style.backgroundColor = this.state.backgroundColor
        }, this.animationDuration * 2)
      }
    },

    onTouchShutterStop(e) {
      this.$refs.shutterRef.classList.remove('shutter-clicked')
    },

    /* Timer */
    onTouchTimerStart(e) {
      this.$refs.timerRef.classList.add('timer-clicked')
    },

    onTouchTimerStop(e) {
      this.$refs.timerRef.classList.remove('timer-clicked')
    },
  },
})

/* Drag lens */
</script>
<style lang="scss" scoped>
.camera {
  display: block;
  width: 570px;
  height: 470px;
  margin-left: auto;
  margin-right: auto;
  margin-top: 100px;
  margin-top: calc(40vh - 235px);
  position: relative;
  &__bottom {
    display: block;
    width: 100%;
    height: 165px;
    position: absolute;
    bottom: 0;
    border-radius: 11px 11px 30px 30px;
    background-image: radial-gradient(#e1dfe2 60%, transparent 60%),
      radial-gradient(#e1dfe2 60%, transparent 60%), linear-gradient(90deg, #e1dfe2, #eae8eb),
      linear-gradient(90deg, #eae8eb, #e1dfe2),
      linear-gradient(90deg, #85817e, rgba(47, 43, 43, 0) 5% 95%, #696461),
      linear-gradient(#4e4a49, #100c0d), linear-gradient(#312f32, #2a2a27, #363233);
    background-size: 50px 60px, 50px 60px, 185px 30px, 185px 30px, 100% 100%, 100% 20px, 100% 100%;
    background-repeat: no-repeat;
    background-position: 160px -26px, 360px -26px, top right, top left, top left, bottom left,
      bottom left;
    box-shadow: -1px 3px 2px 0px rgba(249, 247, 248, 0.65) inset;

    &__printer {
      display: block;
      width: 470px;
      height: 40px;
      background-color: red;
      margin-left: auto;
      margin-right: auto;
      margin-top: 60px;
      border-radius: 3px;

      background-image: linear-gradient(90deg, #474548 90%, #343233 90%),
        linear-gradient(90deg, #0e090d 10%, #4a4849 10%),
        linear-gradient(#4c4a4d 4%, #161214 9% 20%, #484445 30% 55%, #1a1617 80% 93%, #b0afad 99%);
      background-size: 8px 100%, 8px 100%, 100% 100%;
      background-repeat: no-repeat;
      background-position: top left, top right;
    }

    &__labels {
      .rainbow {
        display: block;
        width: 40px;
        height: 46px;
        position: absolute;
        top: 100px;
        left: 80px;
        background-image: linear-gradient(
          #1d160f 5%,
          /* Black*/ #0e9ee0 5% 14%,
          /* Blue */ #1f211a 14% 19%,
          /* Black */ #0eae4f 19% 32%,
          /* Green */ #2b2106 32% 37%,
          /* Black */ #ffb404 37% 50%,
          /* Yellow */ #2a1303 50% 55%,
          /* Black */ #fe8204 55% 68%,
          /* Orange */ #292313 68% 80%,
          /* Black */ #e02d28 80% /* Red */
        );
      }

      .logo {
        font-family: 'Helvetica Neue', 'Helvetica', sans-serif;
        font-size: 24px;
        font-weight: 600;
        color: #cdccc8;
        text-align: center;
        margin-top: 8px;
      }
    }

    .tag-toggle-container {
      display: block;
      width: 135px;
      height: 35px;
      background-color: red;
      position: absolute;
      margin-left: auto;
      margin-right: auto;
      left: 0;
      right: 0;
      border-radius: 0 0 10px 10px;
      background-image: radial-gradient(#353334, #4c4849 40%, transparent 70%),
        radial-gradient(#29272a, #464445 40%, transparent 70%),
        linear-gradient(#8b8786 10%, #5e5a5b 20% 65%, #969291);
      background-size: 70px 70px, 70px 70px, 100% 100%;
      background-repeat: no-repeat;
      background-position: top -25px left -40px, top -15px right -35px, top right;

      .toggle {
        position: absolute;
        display: block;
        width: 100px;
        height: 20px;
        top: 6px;
        left: 0;
        right: 0;
        margin-left: auto;
        margin-right: auto;
        border-radius: 10px;
        background-image: linear-gradient(#747371 2%, #525055 2%, #565152, #535250);
        border: 0.5px solid #141011;
        .handle {
          display: block;
          position: absolute;
          width: 20px;
          height: 20px;
          right: 0;
          transition: all 500ms;
          top: -2px;
          background-color: red;
          background-image: radial-gradient(#525051, #4b4746);
          border-radius: 10px;
          border: 0.5px solid rgba(133, 129, 128, 0.15);
          box-shadow: -1px 5px 5px #181619;
        }
      }
    }
  }

  &__top {
    display: block;
    position: relative;
    width: 540px;
    height: 320px;
    margin-left: auto;
    margin-right: auto;
    border-radius: 35px 35px 0 0;
    background-image: linear-gradient(
        90deg,
        rgba(243, 243, 243, 0.75),
        rgba(243, 243, 243, 0) 15% 85%,
        rgba(243, 243, 243, 0.75)
      ),
      linear-gradient(#fefefe, #f9f7f8), linear-gradient(#ddd9da, #e2dedf, #eae8eb, #f3f1f4);
    background-size: 100%, 100% 3px, 100%;
    background-repeat: no-repeat;
    box-shadow: -1px 1px 2px 3px rgba(249, 247, 248, 0.85) inset;

    &__lens {
      position: absolute;
      display: block;
      width: 210px;
      height: 210px;
      border-radius: 105px;
      background-color: black;
      top: 15px;
      left: 0;
      right: 0;
      margin-left: auto;
      margin-right: auto;

      background-image: radial-gradient(transparent, #000000),
        radial-gradient(rgba(51, 53, 54, 0.4), transparent),
        radial-gradient(
          #2a282b 0% 27%,
          /* dark body 4 */ #070508 27.5% 28%,
          /* dark shadow 4 */ #4e4c4f 28.5% 28.6%,
          /* highlight 3 */ #2a282b 28.7% 29.3%,
          /* dark body 3 */ #070508 29.5% 29.8%,
          /* dark shadow 3 */ #4e4c4f 30% 30.5%,
          /* highlight 2 */ #2a282b 30.5% 32.5%,
          /* dark body 2 */ #070508 33% 33.5%,
          /* dark shadow 2 */ #4e4c4f 34% 34.5%,
          /* highlight 1 */ #2a282b 34.5% 36.5%,
          /* dark body 1 */ #070508 37% 37.5%,
          /* dark shadow 1 */ #3d3b40 38% 38.5%,
          /* shadow 8 */ #908e91 39% 39.5%,
          /* highlight 8 */ #3d3b40 40% 40.5%,
          /* shadow 7 */ #908e91 41% 41.5%,
          /* highlight 7 */ #3d3b40 42% 42.5%,
          /* shadow 6 */ #908e91 43% 43.5%,
          /* highlight 6 */ #3d3b40 44% 44.5%,
          /* shadow 5 */ #908e91 45% 45.5%,
          /* highlight 5 */ #3d3b40 46% 46.5%,
          /* shadow 4 */ #908e91 47% 47.5%,
          /* highlight 4 */ #3d3b40 48% 48.5%,
          /* shadow 3 */ #908e91 49% 49.5%,
          /* highlight 3 */ #3d3b40 50% 50.5%,
          /* shadow 2 */ #908e91 51% 51.5%,
          /* highlight 2 */ #3d3b40 52% 52.5%,
          /* shadow 1 */ #908e91 53% 54%,
          /* highlight 1 */ #241e1e 54.5% 57%,
          /* outer */ #131114 57% 59%,
          /* shadow */ #3c3a3d 59% 60%,
          /* highlight */ #241e1e 60% /* outer */
        );

      background-size: 350px 350px, 350px 350px, 100%;
      background-position: bottom -100px left, top -120px right 10px, center center;
      background-repeat: no-repeat;
      box-shadow: 15px 55px 60px 5px #767072;

      .glass {
        display: block;
        width: 70px;
        height: 70px;
        border-radius: 40px;
        position: absolute;
        margin-left: auto;
        margin-right: auto;
        left: 0;
        right: 0;
        top: 70px;
        background-image: radial-gradient(rgba(119, 109, 80, 0.85), transparent 40%),
          radial-gradient(
            rgba(51, 180, 105, 0.25) 13%,
            rgba(119, 159, 59, 0.2) 53% 70%,
            rgba(119, 159, 59, 0) 68%
          ),
          radial-gradient(
            rgba(51, 180, 105, 0.25) 23%,
            rgba(51, 180, 105, 0.2) 53% 70%,
            rgba(51, 180, 105, 0) 68%
          ),
          /**
      radial-gradient(
        #2C1F28,
        #241921 55%,
        #080609 70%
      );
     * I added an iris here to replace the above gradient
     */
            radial-gradient(
              #000,
              #000 20%,
              #181818 22%,
              #000 24%,
              #181818 26%,
              #000 28%,
              #181818 30%,
              #241921 32%,
              #241921 55%,
              #080609 70%
            );
        background-size: 100%, 190% 100%, 190% 100%, 100%;
        background-repeat: no-repeat;
        background-position: center -10px, -30px -48px, -30px 55px, center;
      }
    }

    &__shutter {
      display: block;
      width: 57px;
      height: 57px;
      position: absolute;
      border-radius: 30px;
      bottom: 30px;
      left: 25px;
      background-image: radial-gradient(#da1107 51%, #ed4b1d 53.5%);
      background-size: 200% 200%;
      background-repeat: no-repeat;
      background-position: bottom -10px center;
      border: 1px solid #520000;
      box-shadow: 1px 1px 1px rgba(255, 255, 255, 0.2) inset, 0 0 2px 6px #dfdad7,
        1px 6px 10px #66514d, -1px -7.5px 1px white;
    }

    &__flash {
      position: absolute;
      width: 90px;
      height: 160px;
      border-radius: 15px;
      left: 25px;
      top: 25px;
      box-shadow: -1px -1px 1px #bdb8b5, -1.5px -2.1px 0.5px #24201d, -4px 4px 3px 3px #f4f0ef,
        -5px 8px 8px #aba6aa, 0.25px 1px 1px 5px #3e3a38 inset, 0 -6px 1px 1px #f6f6f8 inset;
      background-image: linear-gradient(#edecea, #f6f6f8),
        linear-gradient(
          90deg,
          rgba(247, 246, 244, 0) 3% /*transparent*/,
          rgba(247, 246, 244, 0.5) 3% 6% /*white*/,
          rgba(247, 246, 244, 0) 6% 11% /*transparent*/,
          rgba(247, 246, 244, 0.5) 12% 15% /*white*/,
          rgba(247, 246, 244, 0) 15% 21% /*transparent*/,
          rgba(247, 246, 244, 0.5) 21% 23% /*white*/,
          rgba(247, 246, 244, 0) 23% 24% /*transparent*/,
          rgba(247, 246, 244, 0.5) 24% 25% /*white*/,
          rgba(247, 246, 244, 0) 25% 27% /*transparent*/,
          rgba(247, 246, 244, 0.5) 27% 28% /*white*/,
          rgba(247, 246, 244, 0) 28% 31% /*transparent*/,
          rgba(247, 246, 244, 0.5) 31% 33% /*white*/,
          rgba(247, 246, 244, 0) 33% 35% /*transparent*/,
          rgba(247, 246, 244, 0.5) 35% 37% /*white*/,
          rgba(247, 246, 244, 0) 37% 39% /*transparent*/,
          rgba(247, 246, 244, 0.5) 39% 41% /*white*/,
          rgba(247, 246, 244, 0) 41% 43% /*transparent*/,
          rgba(247, 246, 244, 0.5) 43% 45% /*white*/,
          rgba(247, 246, 244, 0) 45% 48% /*transparent*/,
          rgba(247, 246, 244, 0.5) 48% 50% /*white*/,
          rgba(247, 246, 244, 0) 50% 55% /*transparent*/,
          rgba(247, 246, 244, 0.5) 55% 57% /*white*/,
          rgba(247, 246, 244, 0) 57% 59% /*transparent*/,
          rgba(247, 246, 244, 0.5) 59% 60% /*white*/,
          rgba(247, 246, 244, 0) 60% 61% /*transparent*/,
          rgba(247, 246, 244, 0.5) 61% 62% /*white*/,
          rgba(247, 246, 244, 0) 62% 64% /*transparent*/,
          rgba(247, 246, 244, 0.5) 64% 66% /*white*/,
          rgba(247, 246, 244, 0) 66% 69% /*transparent*/,
          rgba(247, 246, 244, 0.5) 69% 71% /*white*/,
          rgba(247, 246, 244, 0) 71% 75% /*transparent*/,
          rgba(247, 246, 244, 0.5) 75% 77% /*white*/,
          rgba(247, 246, 244, 0) 77% 79% /*transparent*/,
          rgba(247, 246, 244, 0.5) 79% 80% /*white*/,
          rgba(247, 246, 244, 0) 80% 81% /*transparent*/,
          rgba(247, 246, 244, 0.5) 81% 82% /*white*/,
          rgba(247, 246, 244, 0) 82% 84% /*transparent*/,
          rgba(247, 246, 244, 0.5) 84% 86% /*white*/,
          rgba(247, 246, 244, 0) 86% 89% /*transparent*/,
          rgba(247, 246, 244, 0.5) 89% 91% /*white*/,
          rgba(247, 246, 244, 0) 81% 95% /*transparent*/
        ),
        linear-gradient(
          90deg,
          rgba(186, 184, 185, 0.1),
          rgba(247, 246, 244, 0.65),
          rgba(186, 184, 185, 0.1)
        ),
        linear-gradient(
          90deg,
          rgba(186, 184, 185, 0.1),
          rgba(247, 246, 244, 0.65),
          rgba(186, 184, 185, 0.1)
        ),
        linear-gradient(#e3deda 15%, #afaaa6 25% 35%, transparent 45%),
        linear-gradient(
          #f0efed 10%,
          #b0aba7 20%,
          #403c3b 40%,
          #2f2b2a 43%,
          #292524 45% 55%,
          #696562 65% 75%,
          #c2bfba 82% 86%,
          #dedad7 90% 93%,
          #c9c6c1 94% 96%,
          #fffefa 98%
        ),
        linear-gradient(#34332f, #3e3a38);
      background-size: 42px 20px, 42px 100%, 3px 100%, 3px 100%, 100% 3px, 100%, 100%;
      background-repeat: no-repeat, no-repeat, no-repeat, no-repeat, repeat, repeat, no-repeat;
      background-position: 24px top, 25px top, 22px top, 64px top, center, center, center;
    }

    .viewfinder {
      position: absolute;
      background-color: #1b1a18;
      width: 110px;
      height: 110px;
      border-radius: 20px;
      right: 20px;
      top: 20px;
      box-shadow: 0.5px 0.5px 1px 1.5px #f1edee, 1.5px 1px 1px 1px #3b3535 inset,
        2px 2px 1px 1px #9f9e9c inset, -0.5px -2px 1.5px #9b9a98 inset, 1px 1.5px 0.5px 1px #fbf7f8;

      .glass {
        position: absolute;
        background-color: white;
        width: 75px;
        height: 75px;
        left: 18px;
        top: 18px;
        border-radius: 20px;
        background-image: radial-gradient(rgba(236, 234, 237, 0.3) 50%, transparent 60%),
          radial-gradient(rgba(193, 189, 186, 0.3) 50%, transparent 60%),
          radial-gradient(#5b5758 45%, #302c2d, #131112);
        background-size: 106% 32%, 106% 25%, 100%;
        background-repeat: no-repeat;
        background-position: -3px -7px, bottom -8px left -3px, center;
        box-shadow: 0px 0px 1px 0px #010000 inset, 0 0 1px 1px #393836 inset,
          0 0 2px 2px #010000 inset, 0 0 2px 4px #393836 inset, 0 0 1.5px 4.5px #010000 inset,
          -0.5px -1px 1px #5f5e5c, 0.25px 2px 2px #464543;
        .back {
          position: absolute;
          background-image: linear-gradient(#eceaed, #e2e0e1);
          width: 40px;
          height: 40px;
          left: 18px;
          top: 19px;
          border-radius: 10px;
          box-shadow: 0.5px 2px 2px 0 #5e5b56, 0px 1px 3px 0px #cac4c5,
            -4px 0px 5px 0px rgba(9, 7, 5, 0.75), 1px 1px 1px 1px #f1ecf0 inset,
            1.5px 1.5px 1px 1px #d1d0ce inset;
          border: 0.5px solid rgba(9, 7, 5, 0.75);
        }
      }
    }

    &__timer {
      position: absolute;
      width: 23px;
      height: 23px;
      border-radius: 20px;
      left: 135px;
      top: 35px;
      background-image: radial-gradient(#e8e4e5, #dedad9);
      box-shadow: 0px 0.5px 1px 0.5px #605c5b, 1px 1px 1px #fffbfc inset;
    }

    .sensor {
      position: absolute;
      width: 23px;
      height: 23px;
      border-radius: 20px;
      left: 135px;
      top: 70px;
      background-image: radial-gradient(#080607, transparent 50%),
        radial-gradient(#0b090a, #211f20, #131112, #383637, #100e0f, #383637, #100e0f);
      backround-size: 60%, 100%;
      background-position: -6px -3px, center;
      background-repeat: no-repeat;
      box-shadow: 0px 0.5px 1px 0.75px #fffbfc, 0 -1px 1px #635f5e;
    }

    .power {
      position: absolute;
      width: 28px;
      height: 28px;
      border-radius: 20px;
      right: 150px;
      top: 195px;
      background-image: radial-gradient(#000000 30%, #252525, #171717, #020001, #242223, #383637);
      box-shadow: 0px 0.5px 1px 0.75px #c6c1c0, 0px -0.5px 0.5px 0.25px #1a1819,
        -5px -8px 8px 1px rgba(86, 82, 82, 0.4);
    }

    .size-toggle-container {
      position: absolute;
      width: 50px;
      height: 22px;
      border-radius: 20px;
      right: 50px;
      top: 145px;
      background-image: linear-gradient(#cc7b00 10%, #b26701);
      box-shadow: 0.2px 0.2px 0.5px 0.5px #935723 inset, 0.5px 1px 0.75px 0.25px #fce9d8;
      .toggle {
        position: absolute;
        width: 20px;
        height: 20px;
        border-radius: 20px;
        right: 0;
        left: 0;
        margin-left: auto;
        margin-right: auto;
        top: 1px;
        background-image: radial-gradient(#fbc00a, #ffdb09);
        box-shadow: 0.5px 1px 0.75px 0.25px #ffed71 inset, 0px -0.5px 0.5px 0.5px #e6a11f inset,
          -1px 0.5px 4px 1px #964900;
      }
    }
  }
  /* Interactive styles */
  z-index: 1000;

  /*
&__lens-shadow {
  display: block;
  width: 210px;
  height: 210px;
  border-radius: 105px;
  margin-left: auto;
  margin-right: auto;
  position: relative;
  top: 15px;
  box-shadow: 15px 55px 60px 5px #767072;
}
 */

  .background-container {
    background: #fff;
    width: 100%;
    height: 100vh;
    position: absolute;
    left: 0;
    top: 0;
    overflow: hidden;
  }

  &__lens .glass {
    z-index: 100;
  }

  .clickable {
    cursor: pointer;
  }

  .dragging {
    cursor: grabbing;
  }

  .no-clickable {
    cursor: default;
  }

  .transition {
    transition: transform 400ms ease-out, background-size 400ms ease-out;
  }

  .shutter-clicked {
    background-image: radial-gradient(#da1107 51%, #c10f06 53.5%) !important;
    box-shadow: 1px 1px 1px rgba(255, 255, 255, 0.2) inset, 0 4px 4px rgba(0, 0, 0, 0.4) inset,
      0 0 2px 6px #dfdad7, 1px 6px 10px #66514d, -1px -7.5px 1px white !important;
  }

  .flash-overlay {
    position: relative;
    background: #fff;
    width: 90px;
    height: 160px;
    border-radius: 15px;
    left: 25px;
    top: 25px;
    z-index: 1;
    opacity: 0;
    box-shadow: 0 0 100px 40px #fff;
  }

  .timer-clicked {
    box-shadow: 0px 0 1px #605c5b, 0px 1.5px 1.5px rgba(0, 0, 0, 0.4) inset,
      0px -1px 0.5px rgba(0, 0, 0, 0.4) inset !important;
  }

  ::selection {
    background: none;
  }
}
</style>
