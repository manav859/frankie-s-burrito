document.addEventListener('DOMContentLoaded', () => {
  const fields = document.querySelectorAll('.frankies-media-field')

  fields.forEach((field) => {
    const input = field.querySelector('.frankies-media-field__input')
    const preview = field.querySelector('.frankies-media-field__preview')
    const previewImage = field.querySelector('.frankies-media-field__preview-image')
    const selectButton = field.querySelector('.frankies-media-field__select')
    const removeButton = field.querySelector('.frankies-media-field__remove')

    if (!(input instanceof HTMLInputElement) || !(preview instanceof HTMLElement) || !(previewImage instanceof HTMLImageElement)) {
      return
    }

    let frame = null

    const sync = (value) => {
      const url = value.trim()
      const hasValue = url.length > 0

      preview.style.display = hasValue ? 'block' : 'none'
      previewImage.src = hasValue ? url : ''

      if (removeButton instanceof HTMLElement) {
        removeButton.style.display = hasValue ? 'inline-block' : 'none'
      }
    }

    if (selectButton instanceof HTMLElement) {
      selectButton.addEventListener('click', (event) => {
        event.preventDefault()

        if (!window.wp || !window.wp.media) {
          return
        }

        if (!frame) {
          frame = window.wp.media({
            title: field.getAttribute('data-media-title') || 'Select image',
            button: {
              text: field.getAttribute('data-media-button-label') || 'Use image',
            },
            library: {
              type: 'image',
            },
            multiple: false,
          })

          frame.on('select', () => {
            const attachment = frame.state().get('selection').first()?.toJSON()
            const url = attachment?.url || ''
            input.value = url
            sync(url)
          })
        }

        frame.open()
      })
    }

    if (removeButton instanceof HTMLElement) {
      removeButton.addEventListener('click', (event) => {
        event.preventDefault()
        input.value = ''
        sync('')
      })
    }

    input.addEventListener('input', () => sync(input.value))
    sync(input.value)
  })
})
