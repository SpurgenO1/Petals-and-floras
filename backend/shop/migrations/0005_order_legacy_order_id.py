from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("shop", "0004_product_category"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="legacy_order_id",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
    ]
