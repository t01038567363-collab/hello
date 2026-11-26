// The sandboxed frame keeps the third-party Maps script away from camera data.
export const STREET_VIEW_DOCUMENT = `<!doctype html>
<html lang="ko">
<head><meta name="viewport" content="width=device-width, initial-scale=1">
<style>html,body,#panorama{width:100%;height:100%;margin:0}</style></head>
<body><div id="panorama" aria-label="Google 스트리트 뷰"></div>
<script>
let panorama, previousPano, pending = 0, moving = false, ready = false, failed = false;
let loadingTimer, movementTimer;
const send = (type, message) => parent.postMessage({ source: 'walk-street-view', type, message }, '*');
const fail = (message) => { failed = true; clearTimeout(loadingTimer); send('error', message); };
window.gm_authFailure = () => fail('Google 지도 인증에 실패했어요. API 키와 결제 설정을 확인해 주세요.');

function advance() {
  if (!ready || moving || pending === 0) return;
  const links = (panorama.getLinks() || []).filter(link => link.pano && link.pano !== previousPano);
  if (!links.length) {
    pending = 0;
    send('notice', '더 이동할 수 있는 거리 사진이 없어요.');
    return;
  }
  const heading = panorama.getPov().heading;
  links.sort((a, b) => {
    const difference = value => Math.abs(((value - heading + 540) % 360) - 180);
    return difference(a.heading || 0) - difference(b.heading || 0);
  });
  previousPano = panorama.getPano();
  pending--;
  moving = true;
  clearTimeout(movementTimer);
  movementTimer = setTimeout(() => {
    moving = false;
    pending = 0;
    send('notice', '다음 거리 사진을 불러오지 못했어요.');
  }, 8000);
  panorama.setPov({ heading: links[0].heading || 0, pitch: 0 });
  panorama.setPano(links[0].pano);
}

function initialize(config) {
  loadingTimer = setTimeout(() => fail('거리 사진을 불러오지 못했어요. 인터넷과 API 설정을 확인해 주세요.'), 15000);
  window.initWalkStreetView = () => {
    if (failed) return;
    const service = new google.maps.StreetViewService();
    service.getPanorama({ location: config.location, radius: 1000, source: google.maps.StreetViewSource.OUTDOOR }, (data, status) => {
      if (failed) return;
      if (status !== google.maps.StreetViewStatus.OK || !data || !data.location || !data.location.pano) {
        fail('이 장소 근처의 거리 사진을 찾지 못했어요.');
        return;
      }
      panorama = new google.maps.StreetViewPanorama(document.getElementById('panorama'), {
        pano: data.location.pano,
        pov: { heading: config.heading, pitch: 0 },
        addressControl: false,
        fullscreenControl: false,
        motionTracking: false,
        motionTrackingControl: false,
        linksControl: false,
        clickToGo: false,
        disableDefaultUI: true,
        panControl: false
      });
      panorama.addListener('links_changed', () => {
        if (failed) return;
        clearTimeout(movementTimer);
        moving = false;
        if (!ready) {
          ready = true;
          clearTimeout(loadingTimer);
          send('ready');
        }
        advance();
      });
    });
  };
  const script = document.createElement('script');
  const params = new URLSearchParams({ key: config.key, loading: 'async', callback: 'initWalkStreetView', v: 'weekly' });
  script.src = 'https://maps.googleapis.com/maps/api/js?' + params;
  script.onerror = () => fail('Google 지도를 불러오지 못했어요. 인터넷과 API 설정을 확인해 주세요.');
  document.head.appendChild(script);
}

window.addEventListener('message', event => {
  if (event.source !== parent || !event.data) return;
  if (event.data.type === 'initialize') initialize(event.data);
  if (event.data.type === 'advance') { pending++; advance(); }
});
</script></body></html>`;
