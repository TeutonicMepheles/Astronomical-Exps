/* Generic scene rotation request. The host maps angles to its own 3D camera or object. */
(() => {
  'use strict';

  const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

  class SceneRotationControl {
    constructor(mount, options = {}) {
      if (!(mount instanceof Element)) throw new TypeError('SceneRotationControl requires a mount Element');

      const {
        step = 30,
        duration = 600,
        value = 0,
        unit = '°',
        orientation = 'horizontal',
        disabled = false,
        className = '',
        onChange,
        onComplete,
        onBeforeRotate,
        onCancel
      } = options;
      if (!['horizontal', 'vertical'].includes(orientation)) throw new RangeError("SceneRotationControl orientation must be 'horizontal' or 'vertical'");
      const vertical = orientation === 'vertical';
      const negativeLabel = options.negativeLabel ?? (vertical ? '下探' : options.leftLabel ?? '左转');
      const positiveLabel = options.positiveLabel ?? (vertical ? '上抬' : options.rightLabel ?? '右转');
      const groupLabel = options.groupLabel ?? (vertical ? '俯仰控制' : '场景旋转');
      const negativeAriaLabel = options.negativeAriaLabel ?? options.leftAriaLabel ?? '';
      const positiveAriaLabel = options.positiveAriaLabel ?? options.rightAriaLabel ?? '';

      this.mount = mount;
      this.step = Math.max(0.001, Math.abs(finite(step, 30)));
      this.duration = Math.max(0, finite(duration, 600));
      this.unit = String(unit);
      this.orientation = orientation;
      this.value = finite(value, 0);
      this.disabled = Boolean(disabled);
      this.onChange = typeof onChange === 'function' ? onChange : null;
      this.onComplete = typeof onComplete === 'function' ? onComplete : null;
      this.onBeforeRotate = typeof onBeforeRotate === 'function' ? onBeforeRotate : null;
      this.onCancel = typeof onCancel === 'function' ? onCancel : null;
      this.animating = false;
      this.destroyed = false;
      this.frame = 0;
      this.animation = null;
      this.resolveRotation = null;
      this.abort = new AbortController();

      this.root = document.createElement('div');
      this.root.className = `scene-rotation-control scene-rotation-control--overlay scene-rotation-control--${orientation}` + (className ? ' ' + className : '');
      this.root.setAttribute('role', 'group');
      this.root.setAttribute('aria-label', groupLabel);
      this.root.setAttribute('aria-busy', 'false');
      this.root.innerHTML = `
        <button class="scene-rotation-control__item scene-rotation-control__item--negative scene-rotation-control__item--left" type="button">
          <span class="scene-rotation-control__disc" aria-hidden="true">
            <svg viewBox="0 0 64 64" focusable="false">
              <path d="M43 45c0-13-12-23-27-23H11"/>
              <path d="m22 11-11 11 11 11"/>
            </svg>
          </span>
          <span class="scene-rotation-control__label"></span>
        </button>
        <button class="scene-rotation-control__item scene-rotation-control__item--positive scene-rotation-control__item--right" type="button">
          <span class="scene-rotation-control__disc" aria-hidden="true">
            <svg viewBox="0 0 64 64" focusable="false">
              <path d="M21 45c0-13 12-23 27-23h5"/>
              <path d="m42 11 11 11-11 11"/>
            </svg>
          </span>
          <span class="scene-rotation-control__label"></span>
        </button>
        <span class="scene-rotation-control__status" role="status" aria-live="polite" aria-atomic="true"></span>
      `;

      this.negative = this.root.querySelector('.scene-rotation-control__item--negative');
      this.positive = this.root.querySelector('.scene-rotation-control__item--positive');
      this.left = this.negative;
      this.right = this.positive;
      this.status = this.root.querySelector('.scene-rotation-control__status');
      this.negative.querySelector('.scene-rotation-control__label').textContent = negativeLabel;
      this.positive.querySelector('.scene-rotation-control__label').textContent = positiveLabel;
      this.labels = { negative: negativeLabel, positive: positiveLabel };
      this.ariaLabels = {
        negative: negativeAriaLabel || `${negativeLabel}，${this.step}${this.unit}`,
        positive: positiveAriaLabel || `${positiveLabel}，${this.step}${this.unit}`
      };
      if (vertical) this.root.insertBefore(this.positive, this.negative);

      const signal = this.abort.signal;
      this.negative.addEventListener('click', () => this.rotate(-1), { signal });
      this.positive.addEventListener('click', () => this.rotate(1), { signal });
      this.setDisabled(disabled);
      mount.append(this.root);
    }

    refreshButtons() {
      const unavailable = this.destroyed || this.disabled || this.animating;
      for (const [button, direction] of [[this.negative, 'negative'], [this.positive, 'positive']]) {
        button.setAttribute('aria-label', this.ariaLabels[direction]);
        button.setAttribute('aria-disabled', String(unavailable));
      }
      this.root.classList.toggle('is-disabled', this.disabled || this.destroyed);
      this.root.classList.toggle('is-rotating', this.animating);
      this.root.setAttribute('aria-busy', String(this.animating));
    }

    emit(context) {
      this.onChange?.(context.value, context);
    }

    settle(context) {
      this.animating = false;
      this.animation = null;
      delete this.root.dataset.rotationDirection;
      this.refreshButtons();
      this.status.textContent = `${context.direction < 0 ? this.labels.negative : this.labels.positive} ${Math.abs(context.delta)}${this.unit}`;
      this.onComplete?.(context);
    }

    rotate(direction, { step = this.step, duration = this.duration } = {}) {
      const sign = direction === -1 ? -1 : direction === 1 ? 1 : 0;
      if (!sign) throw new RangeError('SceneRotationControl.rotate direction must be -1 or 1');
      if (this.destroyed || this.disabled || this.animating) return false;

      const requested = {
        direction: sign,
        from: this.value,
        to: this.value + sign * Math.abs(finite(step, this.step)),
        delta: sign * Math.abs(finite(step, this.step))
      };
      if (this.onBeforeRotate?.(requested) === false) return false;

      const travel = Math.max(0, finite(duration, this.duration));
      this.animating = true;
      this.root.dataset.rotationDirection = sign < 0 ? 'negative' : 'positive';
      this.refreshButtons();

      if (reduceMotion() || travel === 0) {
        this.value = requested.to;
        const completed = { ...requested, value: this.value, progress: 1 };
        this.emit(completed);
        this.settle(completed);
        return Promise.resolve(true);
      }

      const started = performance.now();
      this.animation = requested;
      return new Promise(resolve => {
        this.resolveRotation = resolve;
        const tick = now => {
          if (this.destroyed || this.animation !== requested) return resolve(false);
          const progress = Math.min(1, Math.max(0, (now - started) / travel));
          this.value = requested.from + requested.delta * progress;
          this.emit({ ...requested, value: this.value, progress });
          if (this.destroyed || this.animation !== requested) return resolve(false);
          if (progress < 1) {
            this.frame = requestAnimationFrame(tick);
            return;
          }
          this.value = requested.to;
          this.frame = 0;
          this.resolveRotation = null;
          this.settle({ ...requested, value: this.value, progress: 1 });
          resolve(true);
        };
        this.frame = requestAnimationFrame(tick);
      });
    }

    setValue(value) {
      if (this.destroyed) return false;
      this.cancel();
      this.value = finite(value, this.value);
      return true;
    }

    getValue() {
      return this.value;
    }

    setDisabled(value) {
      if (this.destroyed) return;
      this.disabled = Boolean(value);
      if (this.disabled) this.cancel();
      this.refreshButtons();
    }

    cancel() {
      if (!this.animating) return false;
      cancelAnimationFrame(this.frame);
      this.frame = 0;
      const animation = this.animation;
      const resolve = this.resolveRotation;
      this.resolveRotation = null;
      this.animation = null;
      this.animating = false;
      delete this.root.dataset.rotationDirection;
      this.refreshButtons();
      resolve?.(false);
      if (animation) this.onCancel?.({ ...animation, value: this.value });
      return true;
    }

    destroy() {
      if (this.destroyed) return;
      this.cancel();
      this.destroyed = true;
      this.abort.abort();
      this.onChange = null;
      this.onComplete = null;
      this.onBeforeRotate = null;
      this.onCancel = null;
      this.root.remove();
    }
  }

  window.SharedComponents = window.SharedComponents || {};
  window.SharedComponents.SceneRotationControl = SceneRotationControl;
})();
