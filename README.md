<h1 align="center" style="border-bottom: none;">biketag-vue</h1>
<h3 align="center">The Official BikeTag App</h3>
<p align="center">
  <a href="https://creativecommons.org/licenses/by-sa/4.0/">
    <img src='https://img.shields.io/github/license/KenEucker/biketag-vue' alt='license'>
  </a>
  <br>
  <a href="https://github.com/sponsors/KenEucker">
    <img alt="Sponsors" src="https://img.shields.io/github/sponsors/keneucker">
  </a>
  <a href="https://gitter.im/biketagorg/community">
    <img alt="Sponsors" src="https://badges.gitter.im/gitterHQ/gitter.png">
  </a>
</p>
<p align="center">
  <a href="https://github.com/keneucker/biketag-vue/discussions">
    <img alt="Join the community on GitHub Discussions" src="https://img.shields.io/badge/Join%20the%20community-on%20GitHub%20Discussions-blue">
  </a>
</p>

<div align="center">
<img alt="biketag-vue logo" src="https://raw.githubusercontent.com/keneucker/biketag-website/production/public/img/Tag-Logo-Stacked-V2-medium.png" height="auto" width="200" style="border-radius:25%;">
</div>

<div align="center">

## Getting Started With Running The Source Code

`yarn install`

then 

`yarn run dev`

### Configuration

The BikeTag APP does not require any special configuration in order to run the site in read-only mode. You will not be able to upload images to a given game, but you can see all of the content of the available games at biketag.org.

### Adding credentials for uploading/editing content

</div>

```bash
#.env
SUPER_ADMIN=admin@email.com
HOST_KEY=anythingyouwantititobe
ACCESS_TOKEN=BIKETAGACCESSTOKEN
IMGUR_CLIENT_ID=IMGURCLIENTID
IMGUR_CLIENT_SECRET=IMGURCLIENTSECRET
IMGUR_REFRESH_TOKEN=IMGURCLIENTREFRESH
IMGUR_ADMIN_REFRESH_TOKEN=IMGURADMINREFRESH

```
<div align="center">

## Credits

This project was started, managed, funded, deployed, and ultimately delivered by a single contributor. This project, and the [BikeTag API][biketag-api] that is uses, is the culmination of four years of attempting to _"make it easy for anyone and everyone to play the game of BikeTag in their area"_. Thanks to those who helped finish up features and polish the UI so that this one single contributor could meet their goal.

Many thanks to those who have donated to the BikeTag Project.

Thank you to [Netlify][netlify] for providing a [free open source plan][netlify-opensource] for hosting.

Support the BikeTag Project on [GitHub][github], [Patreon][patreon], or directly by going out and playing a round of [BikeTag in your city](https://client.org)!

  ## Vendors


[twitter]: https://developer.twitter.com/en/docs/twitter-api
[github]: https://github.com/sponsors/KenEucker
[patreon]: https://patreon.com/BikeTag
[biketag-api]: https://github.com/keneucker/biketag-api
[sanity]: https://www.sanity.io/docs/api-versioning
[imgur]: https://www.npmjs.com/package/imgur/v/next
[reddit]: https://www.npmjs.com/package/snoowrap
[netlify]: https://www.netlify.com
[netlify-opensource]: https://www.netlify.com/legal/open-source-policy




  Images powered by imgur.com

  [![imgur.com][imgur-image]](https://apidocs.imgur.com/)

  Structured Content powered by sanity.io

  [![sanity.io][sanity-image]](https://www.sanity.io/docs/http-api)

  Discussions powered by reddit.com

  [![reddit.com][reddit-image]](https://www.reddit.com/dev/api/)

  Mentions powered by twitter.com

  [![twitter.com][twitter-image]](https://developer.twitter.com/en/docs)

  [biketag-logo]: https://raw.githubusercontent.com/keneucker/biketag-website/production/public/img/biketag-api-logo.jpg
  [imgur-image]: https://raw.githubusercontent.com/keneucker/biketag-website/production/public/img/imgur-logo.png
  [sanity-image]: https://raw.githubusercontent.com/keneucker/biketag-website/production/public/img/sanity-logo.png
  [reddit-image]: https://raw.githubusercontent.com/keneucker/biketag-website/production/public/img/reddit-logo.png
  [twitter-image]: https://raw.githubusercontent.com/keneucker/biketag-website/production/public/img/twitter-logo.png

  ## Deployed on Netlify servers

  <a href="https://www.netlify.com">
    <img src="https://www.netlify.com/img/global/badges/netlify-color-accent.svg" alt="Deploys by Netlify" />
  </a>
</div>
