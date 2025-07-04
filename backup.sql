--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5 (Debian 17.5-1.pgdg120+1)
-- Dumped by pg_dump version 17.5 (Debian 17.5-1.pgdg120+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: amenities; Type: TABLE; Schema: public; Owner: myuser
--

CREATE TABLE public.amenities (
    amenity_id integer NOT NULL,
    amenity_name character varying(100) NOT NULL
);


ALTER TABLE public.amenities OWNER TO myuser;

--
-- Name: amenities_amenity_id_seq; Type: SEQUENCE; Schema: public; Owner: myuser
--

CREATE SEQUENCE public.amenities_amenity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.amenities_amenity_id_seq OWNER TO myuser;

--
-- Name: amenities_amenity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myuser
--

ALTER SEQUENCE public.amenities_amenity_id_seq OWNED BY public.amenities.amenity_id;


--
-- Name: contact_info; Type: TABLE; Schema: public; Owner: myuser
--

CREATE TABLE public.contact_info (
    contact_id integer NOT NULL,
    manager_name character varying(100) NOT NULL,
    primary_phone character varying(15) NOT NULL,
    secondary_phone character varying(15),
    line_id character varying(50),
    email character varying(100)
);


ALTER TABLE public.contact_info OWNER TO myuser;

--
-- Name: contact_info_contact_id_seq; Type: SEQUENCE; Schema: public; Owner: myuser
--

CREATE SEQUENCE public.contact_info_contact_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contact_info_contact_id_seq OWNER TO myuser;

--
-- Name: contact_info_contact_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myuser
--

ALTER SEQUENCE public.contact_info_contact_id_seq OWNED BY public.contact_info.contact_id;


--
-- Name: dormitories; Type: TABLE; Schema: public; Owner: myuser
--

CREATE TABLE public.dormitories (
    dorm_id integer NOT NULL,
    dorm_name character varying(100) NOT NULL,
    address text NOT NULL,
    dorm_description text NOT NULL,
    latitude numeric(10,8),
    longitude numeric(11,8),
    bed_type character varying(20) NOT NULL,
    rental_type character varying(20) NOT NULL,
    electricity_type character varying(20) NOT NULL,
    electricity_rate numeric(5,2) NOT NULL,
    water_type character varying(20) NOT NULL,
    water_rate numeric(8,2) NOT NULL,
    monthly_price integer NOT NULL,
    daily_price integer,
    zone_id integer,
    owner_id integer,
    contact_id integer,
    approval_status character varying(20) DEFAULT 'รออนุมัติ'::character varying NOT NULL,
    created_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    min_price integer,
    max_price integer
);


ALTER TABLE public.dormitories OWNER TO myuser;

--
-- Name: dormitories_dorm_id_seq; Type: SEQUENCE; Schema: public; Owner: myuser
--

CREATE SEQUENCE public.dormitories_dorm_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dormitories_dorm_id_seq OWNER TO myuser;

--
-- Name: dormitories_dorm_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myuser
--

ALTER SEQUENCE public.dormitories_dorm_id_seq OWNED BY public.dormitories.dorm_id;


--
-- Name: dormitory_amenities; Type: TABLE; Schema: public; Owner: myuser
--

CREATE TABLE public.dormitory_amenities (
    dorm_amenity_id integer NOT NULL,
    dorm_id integer,
    amenity_id integer,
    is_available boolean DEFAULT true NOT NULL
);


ALTER TABLE public.dormitory_amenities OWNER TO myuser;

--
-- Name: dormitory_amenities_dorm_amenity_id_seq; Type: SEQUENCE; Schema: public; Owner: myuser
--

CREATE SEQUENCE public.dormitory_amenities_dorm_amenity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dormitory_amenities_dorm_amenity_id_seq OWNER TO myuser;

--
-- Name: dormitory_amenities_dorm_amenity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myuser
--

ALTER SEQUENCE public.dormitory_amenities_dorm_amenity_id_seq OWNED BY public.dormitory_amenities.dorm_amenity_id;


--
-- Name: dormitory_images; Type: TABLE; Schema: public; Owner: myuser
--

CREATE TABLE public.dormitory_images (
    image_id integer NOT NULL,
    dorm_id integer,
    image_url character varying(500) NOT NULL,
    image_type character varying(50) NOT NULL,
    upload_date timestamp without time zone DEFAULT now() NOT NULL,
    is_primary boolean DEFAULT false NOT NULL
);


ALTER TABLE public.dormitory_images OWNER TO myuser;

--
-- Name: dormitory_images_image_id_seq; Type: SEQUENCE; Schema: public; Owner: myuser
--

CREATE SEQUENCE public.dormitory_images_image_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dormitory_images_image_id_seq OWNER TO myuser;

--
-- Name: dormitory_images_image_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myuser
--

ALTER SEQUENCE public.dormitory_images_image_id_seq OWNED BY public.dormitory_images.image_id;


--
-- Name: member_requests; Type: TABLE; Schema: public; Owner: myuser
--

CREATE TABLE public.member_requests (
    request_id integer NOT NULL,
    user_id integer,
    dorm_id integer,
    request_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status character varying(20) DEFAULT 'รอพิจารณา'::character varying NOT NULL,
    approved_date timestamp without time zone,
    response_note text
);


ALTER TABLE public.member_requests OWNER TO myuser;

--
-- Name: member_requests_request_id_seq; Type: SEQUENCE; Schema: public; Owner: myuser
--

CREATE SEQUENCE public.member_requests_request_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.member_requests_request_id_seq OWNER TO myuser;

--
-- Name: member_requests_request_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myuser
--

ALTER SEQUENCE public.member_requests_request_id_seq OWNED BY public.member_requests.request_id;


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: myuser
--

CREATE TABLE public.reviews (
    review_id integer NOT NULL,
    user_id integer,
    dorm_id integer,
    rating integer NOT NULL,
    comment text,
    review_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_resident boolean DEFAULT false NOT NULL,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.reviews OWNER TO myuser;

--
-- Name: reviews_review_id_seq; Type: SEQUENCE; Schema: public; Owner: myuser
--

CREATE SEQUENCE public.reviews_review_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reviews_review_id_seq OWNER TO myuser;

--
-- Name: reviews_review_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myuser
--

ALTER SEQUENCE public.reviews_review_id_seq OWNED BY public.reviews.review_id;


--
-- Name: room_types; Type: TABLE; Schema: public; Owner: myuser
--

CREATE TABLE public.room_types (
    room_type_id integer NOT NULL,
    dorm_id integer,
    room_name character varying(100) NOT NULL,
    bed_type character varying(50),
    size_sqm numeric(5,2),
    monthly_price integer,
    daily_price integer,
    summer_price integer,
    price_type character varying(50),
    description text,
    max_occupancy integer,
    CONSTRAINT room_types_price_type_check CHECK (((price_type)::text = ANY ((ARRAY['fixed'::character varying, 'contact'::character varying])::text[])))
);


ALTER TABLE public.room_types OWNER TO myuser;

--
-- Name: room_types_room_type_id_seq; Type: SEQUENCE; Schema: public; Owner: myuser
--

CREATE SEQUENCE public.room_types_room_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.room_types_room_type_id_seq OWNER TO myuser;

--
-- Name: room_types_room_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myuser
--

ALTER SEQUENCE public.room_types_room_type_id_seq OWNED BY public.room_types.room_type_id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: myuser
--

CREATE TABLE public.users (
    id integer NOT NULL,
    firebase_uid character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    username character varying(100) NOT NULL,
    display_name character varying(255),
    photo_url character varying(255),
    phone_number character varying(20),
    member_type character varying(50) NOT NULL,
    residence_dorm_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO myuser;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: myuser
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO myuser;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myuser
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: zones; Type: TABLE; Schema: public; Owner: myuser
--

CREATE TABLE public.zones (
    zone_id integer NOT NULL,
    zone_name character varying(100) NOT NULL
);


ALTER TABLE public.zones OWNER TO myuser;

--
-- Name: zones_zone_id_seq; Type: SEQUENCE; Schema: public; Owner: myuser
--

CREATE SEQUENCE public.zones_zone_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.zones_zone_id_seq OWNER TO myuser;

--
-- Name: zones_zone_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myuser
--

ALTER SEQUENCE public.zones_zone_id_seq OWNED BY public.zones.zone_id;


--
-- Name: amenities amenity_id; Type: DEFAULT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.amenities ALTER COLUMN amenity_id SET DEFAULT nextval('public.amenities_amenity_id_seq'::regclass);


--
-- Name: contact_info contact_id; Type: DEFAULT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.contact_info ALTER COLUMN contact_id SET DEFAULT nextval('public.contact_info_contact_id_seq'::regclass);


--
-- Name: dormitories dorm_id; Type: DEFAULT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.dormitories ALTER COLUMN dorm_id SET DEFAULT nextval('public.dormitories_dorm_id_seq'::regclass);


--
-- Name: dormitory_amenities dorm_amenity_id; Type: DEFAULT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.dormitory_amenities ALTER COLUMN dorm_amenity_id SET DEFAULT nextval('public.dormitory_amenities_dorm_amenity_id_seq'::regclass);


--
-- Name: dormitory_images image_id; Type: DEFAULT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.dormitory_images ALTER COLUMN image_id SET DEFAULT nextval('public.dormitory_images_image_id_seq'::regclass);


--
-- Name: member_requests request_id; Type: DEFAULT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.member_requests ALTER COLUMN request_id SET DEFAULT nextval('public.member_requests_request_id_seq'::regclass);


--
-- Name: reviews review_id; Type: DEFAULT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.reviews ALTER COLUMN review_id SET DEFAULT nextval('public.reviews_review_id_seq'::regclass);


--
-- Name: room_types room_type_id; Type: DEFAULT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.room_types ALTER COLUMN room_type_id SET DEFAULT nextval('public.room_types_room_type_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: zones zone_id; Type: DEFAULT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.zones ALTER COLUMN zone_id SET DEFAULT nextval('public.zones_zone_id_seq'::regclass);


--
-- Data for Name: amenities; Type: TABLE DATA; Schema: public; Owner: myuser
--

COPY public.amenities (amenity_id, amenity_name) FROM stdin;
1	แอร์
2	WiFi
3	ตู้เย็น
4	เครื่องซักผ้า
5	ที่จอดรถ
6	ลิฟต์
7	กล้องวงจรปิด
8	ประตูระบบ Keycard
\.


--
-- Data for Name: contact_info; Type: TABLE DATA; Schema: public; Owner: myuser
--

COPY public.contact_info (contact_id, manager_name, primary_phone, secondary_phone, line_id, email) FROM stdin;
1	คุณสมชาย ใจดี	0812345678	0823456789	@manager123	manager@dorm.com
2	คุณสมหญิง พอใจ	0834567890	\N	@manager456	contact@dormitory.com
\.


--
-- Data for Name: dormitories; Type: TABLE DATA; Schema: public; Owner: myuser
--

COPY public.dormitories (dorm_id, dorm_name, address, dorm_description, latitude, longitude, bed_type, rental_type, electricity_type, electricity_rate, water_type, water_rate, monthly_price, daily_price, zone_id, owner_id, contact_id, approval_status, created_date, updated_date, min_price, max_price) FROM stdin;
1	บุญญาดาเพลส	123 ถนนมิตรภาพ ตำบลในเมือง อำเภอเมือง จังหวัดขอนแก่น	หอพักทันสมัย สะดวกสบาย ใกล้มหาวิทยาลัย มีสิ่งอำนวยความสะดวกครบครัน	16.23938095	103.25821711	เตียงเดี่ยว	รายเดือน	ตามหน่วย	7.50	เหมาจ่าย	150.00	3500	120	1	\N	1	อนุมัติแล้ว	2025-06-29 07:08:54.93428	2025-06-29 07:08:54.93428	3500	3500
7	หอพักแสงตะวัน	ท่าขอนยาง	ห้องพักโปร่งสบาย บรรยากาศเงียบสงบ เหมาะกับการพักผ่อนและการเรียนรู้ ใกล้ร้านสะดวกซื้อ	\N	\N	เตียงเดี่ยว	รายเดือน	ตามหน่วย	7.00	ตามหน่วย	20.00	2900	\N	1	\N	\N	อนุมัติแล้ว	2025-06-30 20:36:02.884857	2025-06-30 20:36:02.884857	2900	2900
8	เดอะเบสท์ เรสซิเดนซ์	ขามเรียง	หอพักสไตล์มินิมอล เน้นความเรียบง่ายแต่ฟังก์ชันครบครัน อินเทอร์เน็ตความเร็วสูงทุกห้อง	\N	\N	เตียงคู่	รายเดือน	ตามหน่วย	8.00	ตามหน่วย	25.00	3800	\N	3	\N	\N	อนุมัติแล้ว	2025-06-30 20:36:02.884857	2025-06-30 20:36:02.884857	3800	3800
9	กรีนวิว อพาร์ทเม้นท์	ตัวเมืองมหาสารคาม	อพาร์ทเม้นท์วิวสวนสวย ร่มรื่น อากาศดี การเดินทางสะดวกสบาย มีที่จอดรถกว้างขวาง	\N	\N	เตียงเดี่ยว	รายเดือน/รายวัน	ตามหน่วย	7.50	เหมาจ่าย	150.00	3300	\N	2	\N	\N	อนุมัติแล้ว	2025-06-30 20:36:02.884857	2025-06-30 20:36:02.884857	3300	3300
10	หอพักพูลทรัพย์	ท่าขอนยาง	หอพักใหม่เอี่ยม สิ่งอำนวยความสะดวกครบครัน ปลอดภัยด้วยระบบคีย์การ์ดและกล้องวงจรปิด	\N	\N	เตียงเดี่ยว	รายเดือน	เหมาจ่าย	300.00	ตามหน่วย	22.00	2700	\N	1	\N	\N	อนุมัติแล้ว	2025-06-30 20:36:02.884857	2025-06-30 20:36:02.884857	2700	2700
11	เดอะพรีเมียร์ คอนโด	ย่านธุรกิจ	คอนโดหรูใจกลางเมือง ออกแบบทันสมัย ฟิตเนส สระว่ายน้ำส่วนกลาง ใกล้แหล่งช้อปปิ้งและร้านอาหาร	\N	\N	เตียงคู่	รายเดือน	ตามหน่วย	8.50	ตามหน่วย	28.00	6500	\N	4	\N	\N	อนุมัติแล้ว	2025-06-30 20:36:02.884857	2025-06-30 20:36:02.884857	6500	6500
2	หอพักดี คอนโด	456 ถนนศรีจันทร์ ตำบลในเมือง อำเภอเมือง จังหวัดขอนแก่น	หอพักสไตล์คอนโด ห้องกว้าง แอร์เย็น ปลอดภัย	16.24138095	103.26021711	เตียงคู่	รายเดือน	ตามหน่วย	8.00	ตามหน่วย	25.00	4200	150	1	\N	2	อนุมัติแล้ว	2025-06-29 07:08:54.93428	2025-06-29 07:08:54.93428	4200	4500
\.


--
-- Data for Name: dormitory_amenities; Type: TABLE DATA; Schema: public; Owner: myuser
--

COPY public.dormitory_amenities (dorm_amenity_id, dorm_id, amenity_id, is_available) FROM stdin;
1	1	1	t
2	1	2	t
3	1	3	t
4	1	4	t
5	1	5	t
6	1	6	t
7	1	7	t
8	1	8	t
9	2	1	t
10	2	2	t
11	2	4	t
12	2	5	t
13	2	7	t
14	7	2	t
15	7	4	t
16	7	5	t
17	7	7	f
\.


--
-- Data for Name: dormitory_images; Type: TABLE DATA; Schema: public; Owner: myuser
--

COPY public.dormitory_images (image_id, dorm_id, image_url, image_type, upload_date, is_primary) FROM stdin;
1	1	https://example.com/img/dorm1_main.jpg	jpeg	2025-06-30 21:53:28.629095	t
2	1	https://example.com/img/dorm1_room.jpg	jpeg	2025-06-30 21:53:28.629095	f
3	1	https://example.com/img/dorm1_front.jpg	jpeg	2025-06-30 21:53:28.629095	f
5	2	https://example.com/img/dorm2_room.jpg	jpeg	2025-06-30 21:53:28.629095	f
6	7	https://images.unsplash.com/photo-1555854877-bab0e564b8d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80	jpeg	2025-06-30 22:30:07.365908	t
7	7	https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80	jpeg	2025-06-30 22:30:07.365908	f
8	7	https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80	jpeg	2025-06-30 22:30:07.365908	f
9	8	https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80	jpeg	2025-06-30 22:30:07.365908	t
10	8	https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80	jpeg	2025-06-30 22:30:07.365908	f
11	10	https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80	jpeg	2025-06-30 22:30:07.365908	t
12	10	https://images.unsplash.com/photo-1493809842364-78817add7ffb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80	jpeg	2025-06-30 22:30:07.365908	f
13	10	https://images.unsplash.com/photo-1484154218962-a197022b5858?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80	jpeg	2025-06-30 22:30:07.365908	f
14	11	https://images.unsplash.com/photo-1551963831-b3b1ca40c98e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80	jpeg	2025-06-30 22:30:07.365908	t
15	11	https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80	jpeg	2025-06-30 22:30:07.365908	f
16	9	https://images.unsplash.com/photo-1549294413-26f195200c16?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80	jpeg	2025-06-30 22:30:07.365908	t
17	9	https://images.unsplash.com/photo-1574362848149-11496d93a7c7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80	jpeg	2025-06-30 22:30:07.365908	f
4	2	https://images.unsplash.com/photo-1555854877-bab0e564b8d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80	jpeg	2025-06-30 21:53:28.629095	t
\.


--
-- Data for Name: member_requests; Type: TABLE DATA; Schema: public; Owner: myuser
--

COPY public.member_requests (request_id, user_id, dorm_id, request_date, status, approved_date, response_note) FROM stdin;
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: myuser
--

COPY public.reviews (review_id, user_id, dorm_id, rating, comment, review_date, is_resident) FROM stdin;
\.


--
-- Data for Name: room_types; Type: TABLE DATA; Schema: public; Owner: myuser
--

COPY public.room_types (room_type_id, dorm_id, room_name, bed_type, size_sqm, monthly_price, daily_price, summer_price, price_type, description, max_occupancy) FROM stdin;
1	1	ห้องพื้นฐาน	เตียงเดี่ยว	\N	3500	120	\N	fixed	\N	\N
2	2	ห้องพื้นฐาน	เตียงคู่	\N	4200	150	\N	fixed	\N	\N
3	7	ห้องพื้นฐาน	เตียงเดี่ยว	\N	2900	\N	\N	fixed	\N	\N
4	8	ห้องพื้นฐาน	เตียงคู่	\N	3800	\N	\N	fixed	\N	\N
5	9	ห้องพื้นฐาน	เตียงเดี่ยว	\N	3300	\N	\N	fixed	\N	\N
6	10	ห้องพื้นฐาน	เตียงเดี่ยว	\N	2700	\N	\N	fixed	\N	\N
7	11	ห้องพื้นฐาน	เตียงคู่	\N	6500	\N	\N	fixed	\N	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: myuser
--

COPY public.users (id, firebase_uid, email, username, display_name, photo_url, phone_number, member_type, residence_dorm_id, created_at, updated_at) FROM stdin;
59	PWg3dxpvCOaJs0d4cpVFmRZcV182	figooleo5@gmail.com	figooleo5482	hggutuggg hhftyuj	https://lh3.googleusercontent.com/a/ACg8ocJr-A9dd1KPKKjQCxMS5ozTDg1HICODCPL9HdbqnaG7XmnNQg=s96-c	\N	owner	\N	2025-06-30 22:33:20.016156	2025-06-30 22:33:20.016156
\.


--
-- Data for Name: zones; Type: TABLE DATA; Schema: public; Owner: myuser
--

COPY public.zones (zone_id, zone_name) FROM stdin;
5	ดอนนา
1	หน้ามอ
2	ท่าขอนยาง
3	ขามเรียง
4	กู่แก้ว
\.


--
-- Name: amenities_amenity_id_seq; Type: SEQUENCE SET; Schema: public; Owner: myuser
--

SELECT pg_catalog.setval('public.amenities_amenity_id_seq', 8, true);


--
-- Name: contact_info_contact_id_seq; Type: SEQUENCE SET; Schema: public; Owner: myuser
--

SELECT pg_catalog.setval('public.contact_info_contact_id_seq', 2, true);


--
-- Name: dormitories_dorm_id_seq; Type: SEQUENCE SET; Schema: public; Owner: myuser
--

SELECT pg_catalog.setval('public.dormitories_dorm_id_seq', 11, true);


--
-- Name: dormitory_amenities_dorm_amenity_id_seq; Type: SEQUENCE SET; Schema: public; Owner: myuser
--

SELECT pg_catalog.setval('public.dormitory_amenities_dorm_amenity_id_seq', 17, true);


--
-- Name: dormitory_images_image_id_seq; Type: SEQUENCE SET; Schema: public; Owner: myuser
--

SELECT pg_catalog.setval('public.dormitory_images_image_id_seq', 17, true);


--
-- Name: member_requests_request_id_seq; Type: SEQUENCE SET; Schema: public; Owner: myuser
--

SELECT pg_catalog.setval('public.member_requests_request_id_seq', 16, true);


--
-- Name: reviews_review_id_seq; Type: SEQUENCE SET; Schema: public; Owner: myuser
--

SELECT pg_catalog.setval('public.reviews_review_id_seq', 1, false);


--
-- Name: room_types_room_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: myuser
--

SELECT pg_catalog.setval('public.room_types_room_type_id_seq', 7, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: myuser
--

SELECT pg_catalog.setval('public.users_id_seq', 59, true);


--
-- Name: zones_zone_id_seq; Type: SEQUENCE SET; Schema: public; Owner: myuser
--

SELECT pg_catalog.setval('public.zones_zone_id_seq', 5, true);


--
-- Name: amenities amenities_pkey; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.amenities
    ADD CONSTRAINT amenities_pkey PRIMARY KEY (amenity_id);


--
-- Name: contact_info contact_info_pkey; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.contact_info
    ADD CONSTRAINT contact_info_pkey PRIMARY KEY (contact_id);


--
-- Name: dormitories dormitories_pkey; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.dormitories
    ADD CONSTRAINT dormitories_pkey PRIMARY KEY (dorm_id);


--
-- Name: dormitory_amenities dormitory_amenities_pkey; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.dormitory_amenities
    ADD CONSTRAINT dormitory_amenities_pkey PRIMARY KEY (dorm_amenity_id);


--
-- Name: dormitory_images dormitory_images_pkey; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.dormitory_images
    ADD CONSTRAINT dormitory_images_pkey PRIMARY KEY (image_id);


--
-- Name: member_requests member_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.member_requests
    ADD CONSTRAINT member_requests_pkey PRIMARY KEY (request_id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (review_id);


--
-- Name: room_types room_types_pkey; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.room_types
    ADD CONSTRAINT room_types_pkey PRIMARY KEY (room_type_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_firebase_uid_key; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_firebase_uid_key UNIQUE (firebase_uid);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: zones zones_pkey; Type: CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT zones_pkey PRIMARY KEY (zone_id);


--
-- Name: idx_dorm_zone; Type: INDEX; Schema: public; Owner: myuser
--

CREATE INDEX idx_dorm_zone ON public.dormitories USING btree (zone_id);


--
-- Name: idx_room_types_dorm_id; Type: INDEX; Schema: public; Owner: myuser
--

CREATE INDEX idx_room_types_dorm_id ON public.room_types USING btree (dorm_id);


--
-- Name: dormitories dormitories_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.dormitories
    ADD CONSTRAINT dormitories_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contact_info(contact_id);


--
-- Name: dormitories dormitories_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.dormitories
    ADD CONSTRAINT dormitories_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: dormitories dormitories_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.dormitories
    ADD CONSTRAINT dormitories_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.zones(zone_id);


--
-- Name: dormitory_amenities dormitory_amenities_amenity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.dormitory_amenities
    ADD CONSTRAINT dormitory_amenities_amenity_id_fkey FOREIGN KEY (amenity_id) REFERENCES public.amenities(amenity_id);


--
-- Name: dormitory_amenities dormitory_amenities_dorm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.dormitory_amenities
    ADD CONSTRAINT dormitory_amenities_dorm_id_fkey FOREIGN KEY (dorm_id) REFERENCES public.dormitories(dorm_id) ON DELETE CASCADE;


--
-- Name: dormitory_images dormitory_images_dorm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.dormitory_images
    ADD CONSTRAINT dormitory_images_dorm_id_fkey FOREIGN KEY (dorm_id) REFERENCES public.dormitories(dorm_id) ON DELETE CASCADE;


--
-- Name: dormitory_images fk_images_dorm; Type: FK CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.dormitory_images
    ADD CONSTRAINT fk_images_dorm FOREIGN KEY (dorm_id) REFERENCES public.dormitories(dorm_id) ON DELETE CASCADE;


--
-- Name: member_requests member_requests_dorm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.member_requests
    ADD CONSTRAINT member_requests_dorm_id_fkey FOREIGN KEY (dorm_id) REFERENCES public.dormitories(dorm_id);


--
-- Name: member_requests member_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.member_requests
    ADD CONSTRAINT member_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: reviews reviews_dorm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_dorm_id_fkey FOREIGN KEY (dorm_id) REFERENCES public.dormitories(dorm_id);


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: room_types room_types_dorm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: myuser
--

ALTER TABLE ONLY public.room_types
    ADD CONSTRAINT room_types_dorm_id_fkey FOREIGN KEY (dorm_id) REFERENCES public.dormitories(dorm_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

