/* All experiment stages share the existing introduction markup and typography. */
(function(N){
  'use strict';
  const content={
    mirrors:{title:'牛顿望远镜实验',description:'将桌面五类镜片依次拖入光轴夹具，观察平行光的反射、会聚与发散。'},
    assembly:{title:'牛顿望远镜实验',description:'将主镜和副镜安装到位，验证两次反射形成的光路。'},
    observation:{title:'牛顿望远镜实验',description:'保持主镜不变，更换目镜，用数据解释视野变化。'}
  };
  N.ExperimentHeading=class{
    constructor(element){this.element=element;this.title=element.querySelector('h1');this.description=element.querySelector('.description');}
    update(stage){const value=content[stage];if(!value)return;this.title.textContent=N.developer?.text('title',value.title,stage)??value.title;this.description.textContent=N.developer?.text('description',value.description,stage)??value.description;}
  };
})(window.Newton);
