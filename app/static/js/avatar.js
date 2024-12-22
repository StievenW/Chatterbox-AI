let cropper = null;

document.addEventListener('DOMContentLoaded', () => {
    const avatarInput = document.getElementById('avatarInput');
    const cropModal = document.getElementById('cropModal');
    const cropperImage = document.getElementById('cropperImage');
    const cropButton = document.getElementById('cropButton');
    const avatarPreview = document.getElementById('avatarPreview');
    const closeButton = document.querySelector('#cropModal .close');

    // Load saved avatar if exists
    const savedAvatar = localStorage.getItem('aiAvatar');
    if (savedAvatar) {
        avatarPreview.src = savedAvatar;
    }

    function openModal() {
        cropModal.style.display = 'block';
        document.body.classList.add('crop-modal-open');
    }

    function closeModal() {
        cropModal.style.display = 'none';
        document.body.classList.remove('crop-modal-open');
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
    }

    // Initialize cropper when file is selected
    avatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type and size
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('File size should be less than 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            cropperImage.src = e.target.result;
            openModal();

            // Initialize cropper with a slight delay
            setTimeout(() => {
                if (cropper) {
                    cropper.destroy();
                }
                cropper = new Cropper(cropperImage, {
                    aspectRatio: 1,
                    viewMode: 1,
                    dragMode: 'move',
                    autoCropArea: 0.8,
                    restore: false,
                    guides: true,
                    center: true,
                    highlight: false,
                    cropBoxMovable: true,
                    cropBoxResizable: true,
                    toggleDragModeOnDblclick: false,
                    responsive: true,
                    checkOrientation: true,
                    background: true,
                    modal: true,
                    zoomable: true,
                    scalable: true,
                });
            }, 100);
        };
        reader.readAsDataURL(file);
    });

    // Handle crop and save
    cropButton.addEventListener('click', async () => {
        if (!cropper) return;

        try {
            const canvas = cropper.getCroppedCanvas({
                width: 200,
                height: 200,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high',
            });

            const base64Image = canvas.toDataURL('image/jpeg', 0.85);
            localStorage.setItem('aiAvatar', base64Image);
            avatarPreview.src = base64Image;
            closeModal();

        } catch (error) {
            alert('Failed to process image: ' + error.message);
        }
    });

    // Close modal handlers
    closeButton.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target === cropModal) {
            closeModal();
        }
    });

    // Prevent modal close when clicking inside modal content
    cropModal.querySelector('.modal-content').addEventListener('click', (e) => {
        e.stopPropagation();
    });
}); 