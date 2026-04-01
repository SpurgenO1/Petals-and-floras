from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("shop", "0006_orderhistory"),
    ]

    operations = [
        migrations.CreateModel(
            name="Feedback",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("target_type", models.CharField(choices=[("shop", "Shop"), ("flower", "Flower")], default="shop", max_length=20)),
                ("rating", models.PositiveSmallIntegerField(default=5)),
                ("title", models.CharField(max_length=120)),
                ("message", models.TextField()),
                ("status", models.CharField(choices=[("pending", "Pending"), ("reviewed", "Reviewed"), ("hidden", "Hidden")], default="pending", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("product", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="feedback_entries", to="shop.product")),
                ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="feedback_entries", to="auth.user")),
            ],
            options={"ordering": ["-created_at", "-id"]},
        ),
    ]
