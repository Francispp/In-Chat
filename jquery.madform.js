/* ========================================================================
 * JQuery Plugin MadForm Validator v2.0
 * @author memoma
 * @create 2012-10-18
 * @lastModify 2013-02-25
 * @param form 验证表表单名
 * @param option 验证控件常规配置
 * @param cfg 验证表单正则和错误提示配置
 * @fn FAll return Boolean
 * 
 * 说明：
 * 1、验证的表单元素需加validator属性并赋值、name属性并赋值；
 * 2、this.option.focus|blur分别为表单元素获焦|失焦是否显示提示信息的开关；
 * 3、this.cfg为验证元素的配置信息，以validator的值为对象名，配置 r:正则，f:获焦提示，b:失焦提示，fC:获焦回调，bC:[cb, this]失焦回调(通过验证才执行回调)[回调函数，回调执行环境]；
 * 4、attr : 验证节点validator属性的值;
 * 5、msg : 提示：msg-t, 错误：msg-e, 正确：msg-r;
 * 5、checkbox返回验证的值有多个时格式为'value|value';
 * 6、使用new FFValidator()的方式并赋值给某个变量以使用其属性和方法，如：验证所有表单元素并返回boolean值的FAll方法；
 * 
 * html示例：
 * <form name="form" id="form" class="form-ul">
 *   <ul>
 *		<li>
 *			<label>用户名</label>
 *			<input type="text" validator="name" name="name" />
 *		</li>
 *	</ul>
 * </form>
 * ======================================================================== */

+function ($) { "use strict";

	// MADFORM CLASS DEFINITION
	// ======================
	
	var MadForm = function (element, options, regexp) {
		this.options   = options
		this.$element  = $(element)
		this.regexp    = regexp
		this.tipCollection = {}; //收集报错对象
		this.$madElements = null; //收集验证对象
	}
	
	MadForm.DEFAULTS = {
		focus   : true //默认关闭绑定获焦事件
		, blur  : true  //默认关闭绑定失焦事件
	}
	
	MadForm.REGEXP = { //配置 r:正则，f:获焦提示，b:失焦提示，fCb:获焦回调，bCb:失焦回调
		'name'   : {'r':/^[\u4e00-\u9fa5a-zA-Z0-9]{2,}$/, 'f':'请输入用户名', 'b':'请输入正确的用户名'},                     //用户名
		'email'  : {'r':/^.{1,}@.{2,}\..{2,}/, 'f':'请输入邮箱地址', 'b':'请输入正确的邮箱地址'},                             //邮箱
		'mobile' : {'r':/^\d{11}$/, 'f':'请输入手机号码', 'b':'请输入正确的手机号码'},                                        //手机
		'phone'  : {'r':/^(\d{3,4})?(-)?\d{7,8}(-)?\d*$/, 'f':'请输入电话号码', 'b':'请输入正确的电话号码'},                  //电话
		'zcode'  : {'r':/^[1-9]\d{5}(?!d)$/, 'f':'请输入邮编', 'b':'请输入正确的邮编'},                                     //邮编
		'ident'  : {'r':/^\d{15}$|^\d{17}[\dxX]$/, 'f':'请输入身份证号码', 'b':'请输入正确的身份证号码'},                       //身份证号码
		'code'   : {'r':/^[a-zA-Z0-9]{4}$/, 'f':'请输入验证码', 'b':'请输入正确验证码'},                                       //四位验证码
		'pw'     : {'r':/^[^\s]{6,15}$/, 'f':'请输入登录密码', 'b':'登录密码不正确'}                 //密码
	};

	MadForm.prototype.init = function(){
		var that = this //将当前示例符值给that
		
		that.$madElements = that.$element.find("[data-mad]"); //获取需要验证元素
		
		that.$madElements.each(function(){
			var $this = $(this);
			var _type = $this.attr('type');
			
			if('text' == _type || 'password' == _type || 'select' == $this.get(0).tagName){
				//绑定获焦事件
				if(that.options['focus']){
					$this.on('focus', $.proxy(that.onFocus, that))
				}
				//绑定失焦事件
				if(that.options['blur']){
					$this.on('focus', $.proxy(that.onBlur, that))
				}
			//绑定点击事件
			} else if('radio' == _type || 'checkbox' == _type){
				if(that.options['focus']){
					$this.on('focus', that.onClick)
				}
			}
		})
	}
	
	MadForm.prototype.onBlur = function(e){
		var target = e.target || e
		, $target = $(target)
		, dataMad = $target.attr('data-mad')
		, bl = true
		, cbBl = true
		, val = $target.val().trim()
		, regexp = this.regexp[dataMad]
		
		if(regexp.hasOwnProperty('r')){
			bl = regexp['r'].test(val);
		}
		if(!bl || ''==val){ //显示错误图标
			this.showMsg(dataMad, regexp['b'], 'msg-e');
			return false;
		} else { //显示正确图标
			this.showMsg(dataMad, '', 'msg-r');
		}
		//执行回调
		if(regexp.hasOwnProperty('bC')){
			if(regexp.bC[1]){ //call回调函数原有执行环境
				cbBl = regexp.bC[0].call(regexp.bC[1]);
			} else {
				cbBl = regexp.bC[0]();
			}
			//回调函数返回不是boolean，返回true
			if('undefined' == typeof cbBl){
				cbBl = true;
			}
		}
		return false;
	}
	
	MadForm.prototype.onFocus = function(e){
		var that = this;
		var target = e.target || e;
		var dataMad = $(target).attr('data-mad');
		
		var regexp = this.regexp[dataMad];
		
		this.showMsg(dataMad, regexp['f'], 'msg-t');
		
		
		if(regexp.hasOwnProperty('fC')){
			if(regexp.fC[1]){
				regexp.fC[0].call(regexp.fC[1]);
			} else {
				regexp.fC[0]();
			}
		}
	}
	
	//radio && checkbox 点击事件
	MadForm.prototype.onClick = function(e){
		var target = e.target || e;
		
		var dataMad = $(target).attr('data-mad').val();
		
		if(that.tipCollection.hasOwnProperty(dataMad)){
			that.tipCollection[dataMad].style.display = 'none';
			return true;
		}
		
		var regexp = this.REGEXP[dataMad];
		if(regexp.hasOwnProperty('fC')){
			if(regexp.fC[1]){
				regexp.fC[0].call(regexp.fC[1]);
			} else {
				regexp.fC[0]();
			}
		}
	}
	
	/*
	 * 添加原型方法函数
	 * @param b 方法名称
	 * @param fn 方法
	 */
	MadForm.prototype.add = function(b, fn){
		FFValidator.prototype[b] = fn;
	}
	
	/*
	 * 显示信息<span>节点
	 * @param attr validator属性值
	 * @param tip 显示的文字
	 * @param cls 节点要添加的样式名
	 */
	MadForm.prototype.showMsg = function (dataMad, tip, cls){
		if(this.tipCollection[dataMad]){ //是否已存在该节点
			this.tipCollection[dataMad].html(tip);
			this.tipCollection[dataMad].attr('class', cls);
			this.tipCollection[dataMad].css('display', 'inline-block');
			return false;
		}
		var $span = $('<span>');
		$span.html(tip).attr('class', cls);
		
		this.$element.find('[data-mad="'+dataMad+'"]').parent().append($span);
		
		this.tipCollection[dataMad] = $span;
		return false;
	}
	
	/*
	 * 隐藏信息<span>节点
	 * @param attr validator属性值
	 */
	MadForm.prototype.hideMsg = function(attr){
		if(this.pObject.hasOwnProperty(attr)){
			this.pObject[attr].style.display = 'none';
			return true;
		}
	}
	
	/*
	 * 检测全部表单控件
	 * @return bl 布尔值
	 */
	MadForm.prototype.allMad = function(){
		var bl = true;
		for(var i=0; i<this.formEle.length; i++){
			var target = this.formEle[i],
				attr = target.attributes['validator'].value;
			
			if('radio' == target.type){ //验证radio
				var _val = '',
					_targets = this.form.elements[target.name];
				for(var j=0; j<_targets.length; j++){
					if(true == _targets[j].checked){
						_val = _targets[j].value;
					}
				}
				var _bl = this.cfg[attr]['r'].test(_val);
				if(!_bl){
					this.showMsg(attr, this.cfg[attr]['b'], 'msg-e');
				} else {
					this.hideMsg(attr);
				}
				bl = _bl && bl;
			} else if('checkbox' == target.type){ //验证checkbox
				var _valArr = [],
					_targets = this.form.elements[target.name];
				for(var j=0; j<_targets.length; j++){
					if(true == _targets[j].checked){
						_valArr.push(_targets[j].value);
					}
				}
				var _bl = this.cfg[attr]['r'].test(_valArr.join('|'));
				if(!_bl){
					this.showMsg(attr, this.cfg[attr]['b'], 'msg-e');
				} else {
					this.hideMsg(attr);
				}
				bl = _bl && bl;
			} else if('text' == target.type || 'password' == target.type) { //验证text 和 password
				var _bl = this.cfg[attr]['r'].test(target.value),
					_cbBl = true;
				if(!_bl || '' == target.value){
					this.showMsg(attr, this.cfg[attr]['b'], 'msg-e');
				} else {
					this.hideMsg(attr);
					//通过验证才执行回调
					if(this.cfg[attr].hasOwnProperty('bC')){
						if(this.cfg[attr].bC[1]){ //call回调函数原有执行环境
							_cbBl = this.cfg[attr].bC[0].call(this.cfg[attr].bC[1]);
						} else {
							_cbBl = this.cfg[attr].bC[0]();
						}
						
						if('undefined' == typeof _cbBl){
							_cbBl = true;
						}
					}
				}
				bl = _cbBl && _bl && bl;
			} else { //select
				var _bl = this.cfg[attr]['r'].test(target.value);
				if(!_bl){
					this.showMsg(attr, this.cfg[attr]['b'], 'msg-e');
				} else {
					this.hideMsg(attr);
				}
				bl = _bl && bl;
			}
		}
		return bl;
	}
	
	
	var old = $.fn.modal

	$.fn.madForm = function(option, regexp) {
		return this.each(function() {
			var $this = $(this)
			var data = $this.data('bs.madform')
			var options = $.extend({}, MadForm.DEFAULTS, $this.data(), typeof option == 'object' && option)
			var regexp = $.extend({}, MadForm.REGEXP, typeof regexp == 'object' && regexp)
			
			if (!data)
				$this.data('bs.madform', ( data = new MadForm(this, options, regexp)))
			if ( typeof option == 'string')
				data[option]()
			else
				data.init()
		})
	}

	$.fn.madForm.constructor = MadForm;
	
	// MODAL NO CONFLICT
	// =================

	$.fn.madForm.noConflict = function () {
		$.fn.madForm = old
		return this
	}

}(jQuery);