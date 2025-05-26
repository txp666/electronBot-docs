import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: '桌面级',
    imgSrc: require('@site/static/img/electronBot.png').default,
    description: (
      <>
        结构紧凑，小小的身体拥有6个舵机，非常适合桌面级使用。
      </>
    ),
  },
  {
    title: '开源灵活',
    imgSrc: require('@site/static/img/electronBot.png').default,
    description: (
      <>
        作为完全开源项目，electronBot机器人支持自由修改和扩展。你可以添加传感器、
        更改外观或开发新功能，打造专属机器人。
      </>
    ),
  },
  {
    title: 'STEM教育工具',
    imgSrc: require('@site/static/img/electronBot.png').default,
    description: (
      <>
        electronBot机器人融合了机械、电子、编程和3D打印等多学科知识，
        是激发学生创造力和培养解决问题能力的理想教具。
      </>
    ),
  },
];

function Feature({imgSrc, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <img src={imgSrc} className={styles.featureSvg} alt={title} />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <Heading as="h2" className={styles.featuresTitle}>
          electronBot机器人的特点
        </Heading>
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
