export const dynamicFontDirective = {
  mounted(el: any, binding: any) {
    const adjustFontSizeAndLineHeight = () => {
      const textLength = el.innerText.length
      const containerWidth = el.offsetWidth

      // Calculate an initial font size based on the container width and text length
      let fontSize = containerWidth / (textLength * 0.6) // 0.6 is a tuning factor

      // Apply minimum and maximum constraints
      fontSize = Math.max(fontSize, binding.value.min || 10) // Minimum font size
      fontSize = Math.min(fontSize, binding.value.max || 20) // Maximum font size

      const lineHeightMultiplier = fontSize > 15 ? 1.2 : 1.0 // Adjust line-height based on font size
      const lineHeight = fontSize * lineHeightMultiplier

      el.style.fontSize = fontSize + 'px'
      el.style.lineHeight = lineHeight + 'px'
    }

    adjustFontSizeAndLineHeight()
    window.addEventListener('resize', adjustFontSizeAndLineHeight)

    el.__resizeListener__ = adjustFontSizeAndLineHeight
  },
  unmounted(el: any) {
    window.removeEventListener('resize', el.__resizeListener__)
  },
}
