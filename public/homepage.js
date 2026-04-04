// Auth state management
    const email = localStorage.getItem("email");
    const loginBtn = document.getElementById("loginBtn");
    const profileBox = document.getElementById("profileBox");
    const avatar = document.getElementById("avatar");
    const logoutIcon = document.getElementById("logoutIcon");
    const getStartedBtn = document.getElementById("getStartedBtn");
    const ctaBtn = document.getElementById("ctaBtn");

    // Update navbar based on auth state
    function updateAuthState() {
      if (email) {
        loginBtn.style.display = "none";
        profileBox.style.display = "flex";
        avatar.textContent = email.charAt(0).toUpperCase();
      } else {
        loginBtn.style.display = "flex";
        profileBox.style.display = "none";
      }
    }

    // Initial state
    updateAuthState();

    // Logout handler
    logoutIcon.addEventListener("click", () => {
      localStorage.removeItem("email");
      localStorage.removeItem("redirectAfterLogin");
      
      // Smooth transition
      profileBox.style.opacity = "0";
      setTimeout(() => {
        updateAuthState();
        profileBox.style.opacity = "1";
      }, 300);
    });

    // Get Started / CTA handlers
    [getStartedBtn, ctaBtn].forEach(btn => {
      btn.addEventListener("click", () => {
        if (!email) {
          localStorage.setItem("redirectAfterLogin", "dashboard.html");
          window.location.href = "loginpage.html";
        } else {
          window.location.href = "dashboard.html";
        }
      });
    });

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
          behavior: 'smooth'
        });
      });
    });

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
      const navbar = document.querySelector('.navbar');
      if (window.scrollY > 100) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });