import { dedent } from "@std/text";

export default {
  async fetch(request, _env, _ctx) {
    switch (new URL(request.url).pathname) {
      case '/': return index();
      case '/embed': return await embed(request);
      case '/cover': return await cover(request);
      default: return new Response('page not found', { status: 404 });
    }
  }
}

function index() {
  return new Response(
    dedent`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cicada</title>
      </head>
      <body>
        <h1>Cicada</h1>
        <p>An embeddable, stylable page for displaying Last.fm status with no client-side JS.</p>
        <p>For example:</p>
        <code>
        ${safeHtmlString`<iframe href='https://cicada.pixlxip.deno.net/embed?user=pixl_xip&refresh=10'/>`}
        </code>
      </body>
      </html>
    `,
    {
      headers: {
        'content-type': 'text/html;charset=UTF-8',
      }
    }
  );
}

async function embed(request) {
  const params = new URL(request.url).searchParams;
  const user = params.get('user') || 'pixl_xip';

  const coverSize = params.get('coversize') || 'medium';
  const coverIndex = { small: 0, medium: 1, large: 2, extralarge: 3 }[coverSize];
  if (coverIndex === undefined) return new Response('invalid cover size', { status: 400 });

  const autoRefresh = params.get('refresh') || '30';

  const css = params.get('css');
  const api_key = Deno.env.get('LASTFM_API_KEY');

  const recentsUrl = new URL('https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&limit=1&format=json');
  recentsUrl.searchParams.append('user', user);
  recentsUrl.searchParams.append('api_key', api_key);
  const recentsResponse = await fetch(recentsUrl.toString());
  const recents = await recentsResponse.json();

  if (recents.error && recents.message === 'User not found') return new Response('user not found', { status: 404 });

  console.log('recents', JSON.stringify(recents));

  const track = recents.recenttracks.track[0];

  const trackUrl = new URL('https://ws.audioscrobbler.com/2.0/?method=track.getInfo&format=json');
  trackUrl.searchParams.append('track', track.name);
  trackUrl.searchParams.append('artist', track.artist['#text']);
  trackUrl.searchParams.append('api_key', api_key);
  const trackResponse = await fetch(trackUrl.toString());
  const detailedTrack = await trackResponse.json();

  console.log('track', JSON.stringify(detailedTrack));

  const bodyClasses = [
    ...(track?.['@attr']?.nowplaying === 'true' ? ['nowplaying'] : []),
    ...(!track ? ['empty'] : [])
  ].join(' ');
  const bodyClassAttr = bodyClasses ? ` class='${bodyClasses}'` : '';

  const html = dedent`
    <!DOCTYPE html>
    <head>
      <style>.promo { display: none; }</style>${css ? `
      <link rel='stylesheet' href='${css}' />` : ''}${autoRefresh ? `
      <meta http-equiv='refresh' content='${autoRefresh}' />` : ''}
    </head>
    <body${bodyClassAttr}>
      <img class='cover' src='${detailedTrack?.track?.album?.image?.[coverIndex]?.['#text'] || ''}' />
      <span class='songname'>${safeHtmlString(track?.name || '')}</span>
      <a class='linkedsongname' href='${track?.url || ''}'>${safeHtmlString(track?.name || '')}</a>
      <span class='albumname'>${safeHtmlString(track?.album?.['#text'] || '')}</span>
      <a class='linkedalbumname' href='${detailedTrack?.track?.album?.url || ''}'>${safeHtmlString(track?.album?.['#text'] || '')}</a>
      <span class='artistname'>${safeHtmlString(track?.artist?.['#text'] || '')}</span>
      <span class='promo'>Widget from <a href='https://github.com/pixlxip/Cicada/'>Cicada</a></span>
    </body>
  `;

  return new Response(html, {
    headers: {
      'content-type': 'text/html;charset=UTF-8',
    },
  });
}

async function cover(request) {
  return new Response('not implemented', { status: 405 });
}

function safeHtmlString(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
