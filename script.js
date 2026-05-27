// ===== Hero 轮播 =====
let currentSlide = 0;
const slides = document.querySelectorAll('.hero-slide');
const dots = document.querySelectorAll('.hero-dots .dot');
const totalSlides = slides.length;

function goToSlide(index) {
  slides[currentSlide].classList.remove('active');
  dots[currentSlide].classList.remove('active');
  currentSlide = index;
  slides[currentSlide].classList.add('active');
  dots[currentSlide].classList.add('active');
}

function nextSlide() {
  goToSlide((currentSlide + 1) % totalSlides);
}

// 点击指示器切换
dots.forEach(dot => {
  dot.addEventListener('click', () => {
    goToSlide(parseInt(dot.dataset.slide));
  });
});

// 自动轮播
let slideInterval = setInterval(nextSlide, 4500);

// 鼠标悬停暂停轮播
document.querySelector('.hero').addEventListener('mouseenter', () => {
  clearInterval(slideInterval);
});
document.querySelector('.hero').addEventListener('mouseleave', () => {
  slideInterval = setInterval(nextSlide, 4500);
});

// ===== 移动端导航菜单 =====
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');

navToggle.addEventListener('click', () => {
  navMenu.classList.toggle('active');
});

navMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navMenu.classList.remove('active');
  });
});

// ===== 导航栏滚动效果 =====
const navbar = document.getElementById('navbar');
const backToTop = document.getElementById('backToTop');

window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;

  // 导航栏阴影
  if (scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }

  // 返回顶部按钮
  if (scrollY > 600) {
    backToTop.classList.add('show');
  } else {
    backToTop.classList.remove('show');
  }
});

backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ===== 导航高亮 =====
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-menu a');

function setActiveNav() {
  let current = '';
  sections.forEach(section => {
    const top = section.offsetTop - 120;
    if (window.scrollY >= top) {
      current = section.getAttribute('id');
    }
  });
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === '#' + current) {
      link.classList.add('active');
    }
  });
}

window.addEventListener('scroll', setActiveNav, { passive: true });

// ===== 滚动渐入动画 =====
const fadeEls = document.querySelectorAll(
  '.stat-card, .dept-card, .news-item-side, .campus-card, .contact-item, ' +
  '.faculty-card, .admissions-card, .partner-item, .culture-card, .timeline-card'
);

fadeEls.forEach(el => el.classList.add('fade-in'));

const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });

fadeEls.forEach(el => fadeObserver.observe(el));

// ===== 统计数字滚动动画 =====
const statsSection = document.querySelector('.about-stats');
let statsAnimated = false;

function animateNumbers() {
  const statNumbers = document.querySelectorAll('.stat-number');
  statNumbers.forEach(el => {
    const text = el.textContent;
    const hasPlus = text.includes('+');
    const numStr = text.replace(/\D/g, '');
    if (!numStr) return;

    const target = parseInt(numStr);
    const suffix = hasPlus ? '+' : '';
    let current = 0;
    const increment = Math.max(1, Math.ceil(target / 36));
    const duration = 1400;
    const step = duration / (target / increment);

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        el.textContent = target + suffix;
        clearInterval(timer);
      } else {
        el.textContent = current + suffix;
      }
    }, step);
  });
}

const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !statsAnimated) {
      statsAnimated = true;
      animateNumbers();
    }
  });
}, { threshold: 0.4 });

if (statsSection) statsObserver.observe(statsSection);

// ===== 联系表单提交 =====
const contactForm = document.getElementById('contactForm');

contactForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const btn = contactForm.querySelector('.submit-btn');
  const originalText = btn.textContent;
  btn.textContent = '发送中...';
  btn.disabled = true;
  btn.style.opacity = '0.7';

  setTimeout(() => {
    btn.textContent = '✓ 发送成功！感谢您的留言';
    btn.style.background = '#28a745';
    btn.style.opacity = '1';
    contactForm.reset();

    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
      btn.disabled = false;
    }, 3000);
  }, 1000);
});
