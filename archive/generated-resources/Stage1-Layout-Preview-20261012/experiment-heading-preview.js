/* All experiment stages share the existing introduction markup and typography. */
(function(N){
  'use strict';
  const content={
    mirrors:{title:'牛顿望远镜实验',english:'MIRROR OPTICS',description:'将桌面镜片拖入光轴夹具。沿导轨移动镜面，观察平行光的反射、会聚与发散。'},
    assembly:{title:'牛顿望远镜实验',english:'NEWTONIAN TELESCOPE',description:'将主镜和副镜安装到位，验证两次反射形成的光路。'},
    observation:{title:'牛顿望远镜实验',english:'NEWTONIAN TELESCOPE',description:'保持主镜不变，更换目镜，用数据解释视野变化。'}
  };
  N.ExperimentHeading=class{
    constructor(element){this.element=element;this.title=element.querySelector('h1');this.english=element.querySelector('.english-title');this.description=element.querySelector('.description');}
    update(stage){const value=content[stage];if(!value)return;this.title.textContent=value.title;this.english.textContent=value.english;this.description.textContent=value.description;}
  };
})(window.Newton);

