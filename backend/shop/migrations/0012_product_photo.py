from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("shop", "0011_product_flower_bouquet_prices"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="photo",
            field=models.FileField(blank=True, default="", upload_to="product_photos/"),
        ),
    ]
