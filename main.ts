import "jsr:@std/dotenv/load";

export default {
  async fetch(request, _env, _ctx) {
    const params = new URL(request.url).searchParams;
    const user = params.get('user') || 'pixl_xip';

    const coverSize = params.get('coversize') || 'medium';
    const coverIndex = { small: 0, medium: 1, large: 2, extralarge: 3 }[coverSize];
    if (coverIndex === undefined) return new Response('invalid cover size', { status: 400 });

    const css = params.get('css');
    const api_key = Deno.env.get('LASTFM_API_KEY');

    const url = new URL('https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&limit=1&format=json');
    url.searchParams.append('user', user);
    url.searchParams.append('api_key', api_key);
    const response = await fetch(url.toString());

    const data = await response.json();
    const track = data.recenttracks.track[0];

    console.log(track?.image?.[coverIndex]?.['#text']?.toString?.());

    const html = `<!DOCTYPE html>
    <head>${css ? `
      <link rel='stylesheet' href='${css}' />` : ''}
    </head>
    <body${track?.['@attr']?.nowplaying === 'true' ? ' .nowplaying' : ''}${track ? '' : ' .empty'}>
      <img class='cover' src="${track?.image?.[coverIndex]?.['#text']?.toString?.() || ''}" />
      <span class='songname'>${safeHtmlString(track?.name || '')}</span>
      <a class='linkedsongname' href='${track?.url || ''}'>${safeHtmlString(track?.name || '')}</a>
      <span class='album'>${safeHtmlString(track?.album?.['#text'] || '')}</span>
      <span class='artist'>${safeHtmlString(track?.artist?.['#text'] || '')}</span>
    </body>`;

    return new Response(html, {
      headers: {
        "content-type": "text/html;charset=UTF-8",
      },
    });
  }
};

function safeHtmlString(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
