// script.js

document.addEventListener('DOMContentLoaded', () => {

    // Comportamento do Menu Hamburger
    const hamburger = document.querySelector('.hamburger');
    const nav = document.querySelector('.nav');
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        nav.classList.toggle('active');
    });

    // Fechar menu ao clicar em um link
    const navLinks = document.querySelectorAll('.nav-menu a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (nav.classList.contains('active')) {
                hamburger.classList.remove('active');
                nav.classList.remove('active');
            }
        });
    });

    // Smooth Scroll para links internos
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Slider de Depoimentos
    const slides = document.querySelectorAll('.slide');
    const prevBtn = document.querySelector('.prev');
    const nextBtn = document.querySelector('.next');
    const slider = document.querySelector('.slider');
    let currentIndex = 0;
    let autoPlayInterval;

    function showSlide(index) {
        slides.forEach((slide, i) => {
            slide.classList.remove('active');
            if (i === index) {
                slide.classList.add('active');
            }
        });
    }

    function nextSlide() {
        currentIndex = (currentIndex + 1) % slides.length;
        showSlide(currentIndex);
    }

    function prevSlide() {
        currentIndex = (currentIndex - 1 + slides.length) % slides.length;
        showSlide(currentIndex);
    }

    function startAutoPlay() {
        autoPlayInterval = setInterval(nextSlide, 5000); // Muda a cada 5 segundos
    }

    function stopAutoPlay() {
        clearInterval(autoPlayInterval);
    }

    if (slides.length > 0) {
        showSlide(currentIndex);
        startAutoPlay();
    
        nextBtn.addEventListener('click', () => {
            nextSlide();
            stopAutoPlay();
            startAutoPlay();
        });
    
        prevBtn.addEventListener('click', () => {
            prevSlide();
            stopAutoPlay();
            startAutoPlay();
        });
    
        slider.addEventListener('mouseenter', stopAutoPlay);
        slider.addEventListener('mouseleave', startAutoPlay);
    }


    // Validação do Formulário de Contato
    const form = document.getElementById('contact-form');
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        let isValid = true;

        // Limpa erros anteriores
        clearErrors();

        // Validação dos campos
        const name = document.getElementById('name');
        if (name.value.trim() === '') {
            showError(name, 'O campo Nome é obrigatório.');
            isValid = false;
        }

        const email = document.getElementById('email');
        if (email.value.trim() === '') {
            showError(email, 'O campo E-mail é obrigatório.');
            isValid = false;
        } else if (!isValidEmail(email.value)) {
            showError(email, 'Por favor, insira um e-mail válido.');
            isValid = false;
        }

        const message = document.getElementById('message');
        if (message.value.trim() === '') {
            showError(message, 'O campo Mensagem é obrigatório.');
            isValid = false;
        }

        if (isValid) {
            // Simulação de envio
            console.log('Formulário válido. Enviando dados...');
            console.log({
                name: name.value,
                email: email.value,
                phone: document.getElementById('phone').value,
                message: message.value
            });
            alert('Mensagem enviada com sucesso!');
            form.reset();
        }
    });

    function showError(input, message) {
        const formGroup = input.parentElement;
        formGroup.classList.add('error');
        const errorMessage = formGroup.querySelector('.error-message');
        errorMessage.textContent = message;
    }

    function clearErrors() {
        const errorGroups = form.querySelectorAll('.form-group.error');
        errorGroups.forEach(group => {
            group.classList.remove('error');
            group.querySelector('.error-message').textContent = '';
        });
    }

    function isValidEmail(email) {
        const regex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return regex.test(String(email).toLowerCase());
    }


    // Atualiza o ano no rodapé
    const currentYearSpan = document.getElementById('current-year');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }
});