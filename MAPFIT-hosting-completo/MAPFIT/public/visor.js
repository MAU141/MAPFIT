(function(){
var imgs=document.querySelectorAll('.org-chart-frame img,.anexo-frame img');
if(!imgs.length)return;
var root=document.documentElement;
var ov=document.createElement('div');
ov.className='visor';
ov.hidden=true;
ov.setAttribute('role','dialog');
ov.setAttribute('aria-modal','true');
ov.setAttribute('aria-label','Imagen ampliada');
ov.innerHTML='<div class="visor-bar"><span class="visor-title"></span><div class="visor-tools"><button type="button" class="visor-btn" data-a="out" aria-label="Alejar">−</button><button type="button" class="visor-btn visor-fit" data-a="fit" aria-label="Ajustar a la pantalla">Ajustar</button><button type="button" class="visor-btn" data-a="in" aria-label="Acercar">+</button><button type="button" class="visor-btn visor-x" data-a="close" aria-label="Cerrar">✕</button></div></div><div class="visor-stage"><img alt=""></div><p class="visor-hint">Toca la imagen para acercar, desliza para moverte o gira el celular.</p>';
document.body.appendChild(ov);
var stage=ov.querySelector('.visor-stage');
var pic=stage.querySelector('img');
var title=ov.querySelector('.visor-title');
var opener=null;
var zoom=1;
function setZoom(z){
var w=stage.scrollWidth,h=stage.scrollHeight;
var cx=(stage.scrollLeft+stage.clientWidth/2)/w;
var cy=(stage.scrollTop+stage.clientHeight/2)/h;
zoom=Math.max(1,Math.min(6,z));
pic.style.width=(zoom*100)+'%';
var nw=stage.scrollWidth,nh=stage.scrollHeight;
stage.scrollLeft=cx*nw-stage.clientWidth/2;
stage.scrollTop=cy*nh-stage.clientHeight/2;
}
function openViewer(img){
var card=img.closest('.anexo-card');
var tag=card?card.querySelector('.mono'):null;
var t=tag?tag.textContent.trim():(img.alt==='Org'?'Organigrama':(img.alt||'Imagen'));
opener=img;
pic.src=img.currentSrc||img.src;
pic.alt=t;
title.textContent=t;
ov.hidden=false;
root.classList.add('visor-open');
pic.style.width='100%';
zoom=1;
stage.scrollLeft=0;
stage.scrollTop=0;
ov.querySelector('.visor-x').focus();
}
function closeViewer(){
ov.hidden=true;
root.classList.remove('visor-open');
pic.removeAttribute('src');
if(opener)opener.focus();
}
imgs.forEach(function(img){
img.setAttribute('tabindex','0');
img.setAttribute('role','button');
img.setAttribute('aria-label','Ampliar imagen');
img.addEventListener('click',function(){openViewer(img)});
img.addEventListener('keydown',function(e){
if(e.key==='Enter'||e.key===' '){e.preventDefault();openViewer(img)}
});
});
ov.addEventListener('click',function(e){
var b=e.target.closest('.visor-btn');
if(!b)return;
var a=b.getAttribute('data-a');
if(a==='close')closeViewer();
else if(a==='in')setZoom(zoom*1.5);
else if(a==='out')setZoom(zoom/1.5);
else if(a==='fit')setZoom(1);
});
pic.addEventListener('click',function(){setZoom(zoom>=2.5?1:zoom*2.5)});
document.addEventListener('keydown',function(e){
if(ov.hidden)return;
if(e.key==='Escape')closeViewer();
else if(e.key==='+'||e.key==='=')setZoom(zoom*1.5);
else if(e.key==='-')setZoom(zoom/1.5);
});
})();
