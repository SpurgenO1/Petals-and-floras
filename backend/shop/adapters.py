from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.contrib.auth import get_user_model

User = get_user_model()


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    def pre_social_login(self, request, sociallogin):
        # Skip if already linked
        if sociallogin.is_existing:
            return

        # Check if email exists
        if not sociallogin.user.email:
            return

        # Try to find existing user by email
        try:
            existing_user = User.objects.get(email__iexact=sociallogin.user.email)
            # Connect the social account to the existing user
            sociallogin.connect(request, existing_user)
        except User.DoesNotExist:
            pass
