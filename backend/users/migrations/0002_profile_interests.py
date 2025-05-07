from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('articles', '0001_initial'),
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='interests',
            field=models.ManyToManyField(related_name='users_interested', to='articles.tag'),
        ),
    ] 