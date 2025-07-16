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
2	พัดลม
3	TV
4	เครื่องทำน้ำอุ่น
5	ตู้เย็น
6	ตู้เสื้อผ้า
7	เตียงนอน
8	โต๊ะทำงาน
9	โต๊ะเครื่องแป้ง
10	ลิฟต์
11	WIFI
12	อนุญาตให้เลี้ยงสัตว์
13	รปภ.
14	ฟิตเนส
15	ซิงค์ล้างจาน
16	เครื่องซักผ้า
17	คีย์การ์ด
18	ตู้กดน้ำหยอดเหรียญ
19	ที่จอดรถ
20	กล้องวงจรปิด
21	Lobby
\.


--
-- Data for Name: contact_info; Type: TABLE DATA; Schema: public; Owner: myuser
--

COPY public.contact_info (contact_id, manager_name, primary_phone, secondary_phone, line_id, email) FROM stdin;
1	คุณสมชาย ใจดี	0812345678	0823456789	@manager123	manager@dorm.com
2	คุณสมหญิง พอใจ	0834567890	\N	@manager456	contact@dormitory.com
1001	สมชาย ใจดี	0812345678	0898765432	somchai_dd	somchai@email.com
1002	วิภาดา สุขสวัสดิ์	0823456789	0876543210	wipada_s	wipada@email.com
1003	ธนกร มั่งมี	0834567890	0865432109	thanakorn_m	thanakorn@email.com
1004	นภา วงศ์สุข	0845678901	0854321098	napha_ws	napha@email.com
1005	อนุชา รักเรียน	0856789012	0843210987	anucha_r	anucha@email.com
1006	พิมพ์ใจ สมบูรณ์	0867890123	0832109876	pimjai_s	pimjai@email.com
1007	สมศักดิ์ ทรัพย์มาก	0878901234	0821098765	somsak_s	somsak@email.com
1008	ศิริพร แสนสุข	0889012345	0810987654	siriporn_ss	siriporn@email.com
1009	กิตติพงศ์ ดวงดี	0890123456	0809876543	kittipong_d	kittipong@email.com
1010	มณีรัตน์ เพชรงาม	0901234567	0798765432	maneerat_p	maneerat@email.com
5001	สมชาย ใจดี	0812345678	0898765432	somchai_dd	somchai@email.com
5002	วิภาดา สุขสวัสดิ์	0823456789	0876543210	wipada_s	wipada@email.com
5003	ธนกร มั่งมี	0834567890	0865432109	thanakorn_m	thanakorn@email.com
5004	นภา วงศ์สุข	0845678901	0854321098	napha_ws	napha@email.com
5005	อนุชา รักเรียน	0856789012	0843210987	anucha_r	anucha@email.com
5006	พิมพ์ใจ สมบูรณ์	0867890123	0832109876	pimjai_s	pimjai@email.com
5007	สมศักดิ์ ทรัพย์มาก	0878901234	0821098765	somsak_s	somsak@email.com
5008	ศิริพร แสนสุข	0889012345	0810987654	siriporn_ss	siriporn@email.com
5009	กิตติพงศ์ ดวงดี	0890123456	0809876543	kittipong_d	kittipong@email.com
5010	มณีรัตน์ เพชรงาม	0901234567	0798765432	maneerat_p	maneerat@email.com
\.


--
-- Data for Name: dormitories; Type: TABLE DATA; Schema: public; Owner: myuser
--

COPY public.dormitories (dorm_id, dorm_name, address, dorm_description, latitude, longitude, bed_type, rental_type, electricity_type, electricity_rate, water_type, water_rate, monthly_price, daily_price, zone_id, owner_id, contact_id, approval_status, created_date, updated_date, min_price, max_price) FROM stdin;
1	บุญญาดาเพลส	123 ถนนมิตรภาพ ตำบลในเมือง อำเภอเมือง จังหวัดขอนแก่น	หอพัก [ชื่อหอพัก] ตั้งอยู่ในทำเลสะดวกสบาย ใกล้กับ [ระบุสถานที่สำคัญ เช่น มหาวิทยาลัย ร้านสะดวกซื้อ หรือระบบขนส่งสาธารณะ] บรรยากาศเงียบสงบและเป็นส่วนตัว ทำให้คุณรู้สึกเหมือนได้พักผ่อนอยู่บ้าน บริการและสิ่งอำนวยความสะดวกที่เรามีครบครัน ให้ทุกคนที่เข้าพักรู้สึกผ่อนคลายและปลอดภัย	16.23938095	103.25821711	เตียงเดี่ยว	รายเดือน	มิเตอร์	8.00	เหมาจ่าย	25.00	3500	120	1	64	1	อนุมัติแล้ว	2025-06-29 07:08:54.93428	2025-06-29 07:08:54.93428	3500	3500
5003	ดาวเรือง แมนชั่น	789 ซ.ศรีสวัสดิ์ ต.ตลาด อ.เมือง จ.มหาสารคาม 44000	หอพักสะอาด ปลอดภัย ใกล้ตลาด ร้านอาหาร และมหาวิทยาลัย มีที่จอดรถ ระบบคีย์การ์ด และกล้องวงจรปิดทั่วอาคาร	16.23789150	103.25327110	เตียงเดี่ยว	รายเดือน	ตามหน่วย	7.00	ตามหน่วย	20.00	2900	\N	1	\N	5003	อนุมัติแล้ว	2023-03-05 00:00:00	2023-09-15 00:00:00	\N	\N
5004	บ้านสุขใจ อพาร์ทเม้นท์	234 ถ.สารคาม-วาปี ต.ตลาด อ.เมือง จ.มหาสารคาม 44000	หอพักราคาประหยัด สำหรับนักศึกษา สะอาด เป็นระเบียบ มีเครื่องซักผ้าหยอดเหรียญ อินเตอร์เน็ตความเร็วสูง	16.23618950	103.24927110	เตียงเดี่ยว	รายเดือน	ตามหน่วย	8.00	ตามหน่วย	25.00	3800	\N	1	\N	5004	อนุมัติแล้ว	2023-04-20 00:00:00	2023-10-10 00:00:00	\N	\N
5005	กรีนวิว เรสซิเดนซ์	567 ถ.นครสวรรค์ ต.ตลาด อ.เมือง จ.มหาสารคาม 44000	หอพักสีเขียว บรรยากาศร่มรื่น มีสวนสวย ห้องพักตกแต่งสไตล์มินิมอล เฟอร์นิเจอร์ครบ พร้อมเข้าอยู่ ใกล้มหาวิทยาลัย	16.24058950	103.25827110	เตียงเดี่ยว	รายเดือน/รายวัน	ตามหน่วย	7.50	เหมาจ่าย	150.00	3300	\N	1	\N	5005	อนุมัติแล้ว	2023-05-15 00:00:00	2023-11-20 00:00:00	\N	\N
5006	หอพักลลิษา	890 ถ.นครสวรรค์ ต.ตลาด อ.เมือง จ.มหาสารคาม 44000	หอพักหญิง ปลอดภัยสูง มีแม่บ้านดูแลความสะอาด 24 ชม. ใกล้มหาวิทยาลัย มีรถตู้รับส่ง WiFi ฟรี	16.23858950	103.25427110	เตียงเดี่ยว	รายเดือน	เหมาจ่าย	300.00	ตามหน่วย	22.00	2700	\N	1	\N	5006	อนุมัติแล้ว	2023-06-10 00:00:00	2023-12-05 00:00:00	\N	\N
5008	พลอยใส แมนชั่น	678 ซ.มหาชัยดำริห์ ต.ตลาด อ.เมือง จ.มหาสารคาม 44000	หอพักใกล้มหาวิทยาลัย เดินทางสะดวก มีรถสองแถววิ่งผ่าน ห้องพักสะอาด มีเฟอร์นิเจอร์พื้นฐาน ราคาประหยัด เหมาะสำหรับนักศึกษา	16.23558950	103.24827110	เตียงเดี่ยว	รายเดือน	ตามหน่วย	7.50	เหมาจ่าย	180.00	2800	\N	1	\N	5008	อนุมัติแล้ว	2023-08-15 00:00:00	2023-11-30 00:00:00	\N	\N
8	เดอะเบสท์ เรสซิเดนซ์	ขามเรียง	หอพักสไตล์มินิมอล เน้นความเรียบง่ายแต่ฟังก์ชันครบครัน อินเทอร์เน็ตความเร็วสูงทุกห้อง	17.23750000	103.25217110	เตียงคู่	รายเดือน	ตามหน่วย	8.00	ตามหน่วย	25.00	3800	\N	3	64	\N	อนุมัติแล้ว	2025-06-30 20:36:02.884857	2025-06-30 20:36:02.884857	3800	3800
9	กรีนวิว อพาร์ทเม้นท์	ตัวเมืองมหาสารคาม	อพาร์ทเม้นท์วิวสวนสวย ร่มรื่น อากาศดี การเดินทางสะดวกสบาย มีที่จอดรถกว้างขวาง	50.23958950	103.25217110	เตียงเดี่ยว	รายเดือน/รายวัน	ตามหน่วย	7.50	เหมาจ่าย	150.00	3300	\N	2	64	\N	อนุมัติแล้ว	2025-06-30 20:36:02.884857	2025-06-30 20:36:02.884857	3300	3300
10	หอพักพูลทรัพย์	ท่าขอนยาง	หอพักใหม่เอี่ยม สิ่งอำนวยความสะดวกครบครัน ปลอดภัยด้วยระบบคีย์การ์ดและกล้องวงจรปิด	46.23958950	103.25217110	เตียงเดี่ยว	รายเดือน	เหมาจ่าย	300.00	ตามหน่วย	22.00	2700	\N	1	64	\N	อนุมัติแล้ว	2025-06-30 20:36:02.884857	2025-06-30 20:36:02.884857	2700	2700
11	เดอะพรีเมียร์ คอนโด	ย่านธุรกิจ	คอนโดหรูใจกลางเมือง ออกแบบทันสมัย ฟิตเนส สระว่ายน้ำส่วนกลาง ใกล้แหล่งช้อปปิ้งและร้านอาหาร	16.28989000	103.25217110	เตียงคู่	รายเดือน	ตามหน่วย	8.50	ตามหน่วย	28.00	6500	\N	4	64	\N	อนุมัติแล้ว	2025-06-30 20:36:02.884857	2025-06-30 20:36:02.884857	6500	6500
1004	บ้านสุขใจ อพาร์ทเม้นท์	234 ถ.สารคาม-วาปี ต.ตลาด อ.เมือง จ.มหาสารคาม 44000	หอพักราคาประหยัด สำหรับนักศึกษา สะอาด เป็นระเบียบ มีเครื่องซักผ้าหยอดเหรียญ อินเตอร์เน็ตความเร็วสูง	16.23618950	103.24927110	เตียงเดี่ยว	รายเดือน	ตามหน่วย	8.00	ตามหน่วย	25.00	3800	\N	1	64	1004	อนุมัติแล้ว	2023-04-20 00:00:00	2023-10-10 00:00:00	\N	\N
1005	กรีนวิว เรสซิเดนซ์	567 ถ.นครสวรรค์ ต.ตลาด อ.เมือง จ.มหาสารคาม 44000	หอพักสีเขียว บรรยากาศร่มรื่น มีสวนสวย ห้องพักตกแต่งสไตล์มินิมอล เฟอร์นิเจอร์ครบ พร้อมเข้าอยู่ ใกล้มหาวิทยาลัย	16.24058950	103.25827110	เตียงเดี่ยว	รายเดือน/รายวัน	ตามหน่วย	7.50	เหมาจ่าย	150.00	3300	\N	1	64	1005	อนุมัติแล้ว	2023-05-15 00:00:00	2023-11-20 00:00:00	\N	\N
1006	หอพักลลิษา	890 ถ.นครสวรรค์ ต.ตลาด อ.เมือง จ.มหาสารคาม 44000	หอพักหญิง ปลอดภัยสูง มีแม่บ้านดูแลความสะอาด 24 ชม. ใกล้มหาวิทยาลัย มีรถตู้รับส่ง WiFi ฟรี	16.23858950	103.25427110	เตียงเดี่ยว	รายเดือน	เหมาจ่าย	300.00	ตามหน่วย	22.00	2700	\N	1	64	1006	อนุมัติแล้ว	2023-06-10 00:00:00	2023-12-05 00:00:00	\N	\N
1007	เดอะ คอร์ท อพาร์ทเม้นท์	345 ถ.ศรีสวัสดิ์ ต.ตลาด อ.เมือง จ.มหาสารคาม 44000	หอพักสไตล์โมเดิร์นลักชัวรี่ ใกล้มหาวิทยาลัย มีฟิตเนส สระว่ายน้ำ ระบบรักษาความปลอดภัยแบบดิจิทัล ห้องพักหรูหรา	16.24258950	103.26127110	เตียงคู่	รายเดือน	ตามหน่วย	8.50	ตามหน่วย	28.00	6500	\N	1	64	1007	อนุมัติแล้ว	2023-07-25 00:00:00	2023-12-20 00:00:00	\N	\N
1008	พลอยใส แมนชั่น	678 ซ.มหาชัยดำริห์ ต.ตลาด อ.เมือง จ.มหาสารคาม 44000	หอพักใกล้มหาวิทยาลัย เดินทางสะดวก มีรถสองแถววิ่งผ่าน ห้องพักสะอาด มีเฟอร์นิเจอร์พื้นฐาน ราคาประหยัด เหมาะสำหรับนักศึกษา	16.23558950	103.24827110	เตียงเดี่ยว	รายเดือน	ตามหน่วย	7.50	เหมาจ่าย	180.00	2800	\N	1	64	1008	อนุมัติแล้ว	2023-08-15 00:00:00	2023-11-30 00:00:00	\N	\N
1009	บ้านสวนอพาร์ทเม้นท์	901 ถ.นครสวรรค์ ต.ตลาด อ.เมือง จ.มหาสารคาม 44000	หอพักบรรยากาศร่มรื่น มีสวนขนาดใหญ่ ห้องพักสะอาด เฟอร์นิเจอร์ครบครัน อินเตอร์เน็ตไฟเบอร์ ใกล้มหาวิทยาลัย	16.23758950	103.25227110	เตียงเดี่ยว	รายเดือน	ตามหน่วย	8.00	ตามหน่วย	25.00	3500	\N	1	64	1009	อนุมัติแล้ว	2023-09-01 00:00:00	2023-12-10 00:00:00	\N	\N
1010	ศรีสุข อพาร์ทเม้นท์	432 ถ.ริมคลองสมถวิล ต.ตลาด อ.เมือง จ.มหาสารคาม 44000	หอพักใกล้มหาวิทยาลัย วิวริมคลอง บรรยากาศสงบ เงียบสงบ เหมาะกับการพักผ่อนและการศึกษา มีระเบียงส่วนตัวทุกห้อง	16.23658950	103.25027110	เตียงเดี่ยว	รายเดือน	ตามหน่วย	7.50	ตามหน่วย	20.00	3000	\N	1	64	1010	อนุมัติแล้ว	2023-10-05 00:00:00	2023-12-25 00:00:00	\N	\N
5001	บ้านวิชชา อพาร์ทเม้นท์	123 ถ.นครสวรรค์ ต.ตลาด อ.เมือง จ.มหาสารคาม 44000	หอพักใกล้มหาวิทยาลัยมหาสารคาม เดินทางสะดวก มีสิ่งอำนวยความสะดวกครบครัน ห้องพักสะอาด บรรยากาศร่มรื่น ปลอดภัย มีระบบรักษาความปลอดภัย 24 ชม.	13.73670000	100.52310000	เตียงเดี่ยว	รายเดือน	ตามหน่วย	8.00	เหมาจ่าย	200.00	3500	120	1	64	5001	อนุมัติแล้ว	2023-01-15 00:00:00	2023-10-20 00:00:00	\N	\N
5002	The Green Residence	456 ถ.นครสวรรค์ ต.ตลาด อ.เมือง จ.มหาสารคาม 44000	หอพักสไตล์โมเดิร์น ใกล้ม.มหาสารคาม บรรยากาศเป็นส่วนตัว มีสวนหย่อม ฟรี WiFi ความเร็วสูง ห้องพักกว้างขวาง เฟอร์นิเจอร์ครบ	16.24138950	103.26027110	เตียงคู่	รายเดือน	ตามหน่วย	7.50	ตามหน่วย	18.00	4200	150	1	64	5002	อนุมัติแล้ว	2023-02-10 00:00:00	2023-11-05 00:00:00	\N	\N
\.


--
-- Data for Name: dormitory_amenities; Type: TABLE DATA; Schema: public; Owner: myuser
--

COPY public.dormitory_amenities (dorm_amenity_id, dorm_id, amenity_id, is_available) FROM stdin;
1016	1004	1	t
1017	1004	8	t
1018	1004	9	t
1019	1005	1	t
1020	1005	3	t
1021	1005	7	t
1022	1005	8	t
1023	1005	9	t
1024	1006	1	t
1025	1006	5	t
1026	1006	7	t
1027	1006	8	t
1028	1007	1	t
1029	1007	2	t
1030	1007	3	t
1031	1007	4	t
1032	1007	6	t
1033	1007	7	t
1034	1007	8	t
1035	1007	9	t
1036	1007	10	t
1037	1008	1	t
1038	1008	3	t
1039	1008	7	t
1040	1008	8	t
1041	1009	1	t
1042	1009	3	t
1043	1009	7	t
1044	1009	8	t
1045	1009	9	t
1046	1010	1	t
1047	1010	3	t
1048	1010	7	t
1049	1010	8	t
5001	5001	1	t
5002	5001	3	t
5003	5001	5	t
5004	5001	7	t
5005	5001	8	t
5006	5002	1	t
5007	5002	2	t
5008	5002	3	t
5009	5002	6	t
5010	5002	7	t
5011	5002	8	t
5012	5003	1	t
5013	5003	3	t
5014	5003	6	t
5015	5003	7	t
5016	5004	1	t
5017	5004	8	t
5018	5004	9	t
5019	5005	1	t
5020	5005	3	t
5021	5005	7	t
5022	5005	8	t
5023	5005	9	t
5024	5006	1	t
5025	5006	5	t
5026	5006	7	t
5027	5006	8	t
5037	5008	1	t
5038	5008	3	t
5039	5008	7	t
5040	5008	8	t
\.


--
-- Data for Name: dormitory_images; Type: TABLE DATA; Schema: public; Owner: myuser
--

COPY public.dormitory_images (image_id, dorm_id, image_url, image_type, upload_date, is_primary) FROM stdin;
9	8	https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80	jpeg	2025-06-30 22:30:07.365908	t
10	8	https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80	jpeg	2025-06-30 22:30:07.365908	f
11	10	https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80	jpeg	2025-06-30 22:30:07.365908	t
12	10	https://images.unsplash.com/photo-1493809842364-78817add7ffb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80	jpeg	2025-06-30 22:30:07.365908	f
13	10	https://images.unsplash.com/photo-1484154218962-a197022b5858?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80	jpeg	2025-06-30 22:30:07.365908	f
14	11	https://images.unsplash.com/photo-1551963831-b3b1ca40c98e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80	jpeg	2025-06-30 22:30:07.365908	t
15	11	https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80	jpeg	2025-06-30 22:30:07.365908	f
16	9	https://images.unsplash.com/photo-1549294413-26f195200c16?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80	jpeg	2025-06-30 22:30:07.365908	t
17	9	https://images.unsplash.com/photo-1574362848149-11496d93a7c7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80	jpeg	2025-06-30 22:30:07.365908	f
1	1	https://www.ikkyuads.com/adsPhotos/bunyadaa/2.jpg	jpeg	2025-06-30 21:53:28.629095	t
2	1	https://www.ikkyuads.com/adsPhotos/bunyadaa/2.jpg	jpeg	2025-06-30 21:53:28.629095	f
3	1	https://www.ikkyuads.com/adsPhotos/bunyadaa/2.jpg	jpeg	2025-06-30 21:53:28.629095	f
1009	1004	https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4	exterior	2023-10-10 00:00:00	t
1010	1004	https://images.unsplash.com/photo-1598928506311-c55ded91a20c	room	2023-10-10 00:00:00	f
1011	1005	https://images.unsplash.com/photo-1574362848149-11496d93a7c7	exterior	2023-11-20 00:00:00	t
1012	1005	https://images.unsplash.com/photo-1601084881623-cdf9a8ea242c	room	2023-11-20 00:00:00	f
1013	1006	https://images.unsplash.com/photo-1630699144867-37acec97df5a	exterior	2023-12-05 00:00:00	t
1014	1006	https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf	room	2023-12-05 00:00:00	f
1015	1007	https://images.unsplash.com/photo-1545324418-cc1a3fa10c00	exterior	2023-12-20 00:00:00	t
1016	1007	https://images.unsplash.com/photo-1560185007-5f0bb1866cab	room	2023-12-20 00:00:00	f
1017	1008	https://images.unsplash.com/photo-1623298460174-371443cc45f6	exterior	2023-11-30 00:00:00	t
1018	1008	https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af	room	2023-11-30 00:00:00	f
1019	1009	https://images.unsplash.com/photo-1577552568192-467a12a7f376	exterior	2023-12-10 00:00:00	t
1020	1009	https://images.unsplash.com/photo-1566195992011-5f6b21e539aa	room	2023-12-10 00:00:00	f
1021	1010	https://images.unsplash.com/photo-1605283176435-c69ef1cf4d22	exterior	2023-12-25 00:00:00	t
1022	1010	https://images.unsplash.com/photo-1493809842364-78817add7ffb	room	2023-12-25 00:00:00	f
5001	5001	https://images.unsplash.com/photo-1522708323590-d24dbb6b0267	exterior	2023-10-20 00:00:00	t
5002	5001	https://images.unsplash.com/photo-1560448204-603b3fc33ddc	room	2023-10-20 00:00:00	f
5003	5001	https://images.unsplash.com/photo-1600210492493-0946911123ea	bathroom	2023-10-20 00:00:00	f
5004	5002	https://images.unsplash.com/photo-1565183928294-7063f23ce0f8	exterior	2023-11-05 00:00:00	t
5005	5002	https://images.unsplash.com/photo-1538430989507-797d5e4ba836	room	2023-11-05 00:00:00	f
5006	5002	https://images.unsplash.com/photo-1584622650111-993a426fbf0a	bathroom	2023-11-05 00:00:00	f
5007	5003	https://images.unsplash.com/photo-1623050804066-42bcedb4e81d	exterior	2023-09-15 00:00:00	t
5008	5003	https://images.unsplash.com/photo-1554995207-c18c203602cb	room	2023-09-15 00:00:00	f
5009	5004	https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4	exterior	2023-10-10 00:00:00	t
5010	5004	https://images.unsplash.com/photo-1598928506311-c55ded91a20c	room	2023-10-10 00:00:00	f
5011	5005	https://images.unsplash.com/photo-1574362848149-11496d93a7c7	exterior	2023-11-20 00:00:00	t
5012	5005	https://images.unsplash.com/photo-1601084881623-cdf9a8ea242c	room	2023-11-20 00:00:00	f
5013	5006	https://images.unsplash.com/photo-1630699144867-37acec97df5a	exterior	2023-12-05 00:00:00	t
5014	5006	https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf	room	2023-12-05 00:00:00	f
5017	5008	https://images.unsplash.com/photo-1623298460174-371443cc45f6	exterior	2023-11-30 00:00:00	t
5018	5008	https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af	room	2023-11-30 00:00:00	f
\.


--
-- Data for Name: member_requests; Type: TABLE DATA; Schema: public; Owner: myuser
--

COPY public.member_requests (request_id, user_id, dorm_id, request_date, status, approved_date, response_note) FROM stdin;
17	60	1009	2025-07-04 12:01:12.345456	รอพิจารณา	\N	\N
18	61	1009	2025-07-04 12:07:07.814876	รอพิจารณา	\N	\N
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
4	8	ห้องพื้นฐาน	เตียงคู่	\N	3800	\N	\N	fixed	\N	\N
5	9	ห้องพื้นฐาน	เตียงเดี่ยว	\N	3300	\N	\N	fixed	\N	\N
6	10	ห้องพื้นฐาน	เตียงเดี่ยว	\N	2700	\N	\N	fixed	\N	\N
7	11	ห้องพื้นฐาน	เตียงคู่	\N	6500	\N	\N	fixed	\N	\N
1007	1004	ห้องมาตรฐาน	เตียงเดี่ยว	22.00	3800	130	\N	fixed	ห้องพักมาตรฐาน พร้อมเฟอร์นิเจอร์ครบชุด	\N
1008	1005	ห้องสแตนดาร์ด	เตียงเดี่ยว	24.00	3300	120	\N	fixed	ห้องพักสไตล์มินิมอล ตกแต่งสวย วิวสวน	\N
1009	1005	ห้องพรีเมี่ยม	เตียงคู่	30.00	4500	180	\N	fixed	ห้องพักขนาดใหญ่ ระเบียงกว้าง วิวสวน เฟอร์นิเจอร์ครบ	\N
1010	1006	ห้องมาตรฐาน	เตียงเดี่ยว	20.00	2700	100	\N	fixed	ห้องพักสำหรับนักศึกษาหญิง พร้อมเฟอร์นิเจอร์พื้นฐาน	\N
1011	1007	ห้องดีลักซ์	เตียงคู่	40.00	6500	250	\N	fixed	ห้องพักสไตล์ลักซ์ชัวรี่ พร้อมสิ่งอำนวยความสะดวกครบครัน	\N
1012	1007	ห้องสวีท	เตียงคู่	50.00	8500	300	\N	fixed	ห้องพักขนาดใหญ่พิเศษ มีห้องนั่งเล่นแยก พร้อมอ่างอาบน้ำ	\N
1013	1008	ห้องประหยัด	เตียงเดี่ยว	18.00	2800	100	\N	fixed	ห้องพักราคาประหยัด เฟอร์นิเจอร์พื้นฐาน	\N
1014	1009	ห้องมาตรฐาน	เตียงเดี่ยว	22.00	3500	120	\N	fixed	ห้องพักมาตรฐาน เฟอร์นิเจอร์ครบครัน วิวสวน	\N
1015	1009	ห้องพิเศษ	เตียงเดี่ยว	25.00	4000	150	\N	fixed	ห้องพักขนาดกว้าง มีระเบียงส่วนตัว วิวสวนสวย	\N
1016	1010	ห้องวิวคลอง	เตียงเดี่ยว	20.00	3000	120	\N	fixed	ห้องพักมาตรฐาน มีระเบียงส่วนตัว วิวคลอง	\N
5001	5001	ห้องพัดลม	เตียงเดี่ยว	20.00	3500	120	\N	fixed	ห้องพัดลมขนาดมาตรฐาน พร้อมเฟอร์นิเจอร์พื้นฐาน	\N
5002	5001	ห้องแอร์	เตียงเดี่ยว	20.00	4500	150	\N	fixed	ห้องแอร์ขนาดมาตรฐาน พร้อมเฟอร์นิเจอร์ครบครัน	\N
5003	5002	ห้องมาตรฐาน	เตียงเดี่ยว	25.00	4200	150	\N	fixed	ห้องพักขนาดกว้างขวาง มีระเบียง เฟอร์นิเจอร์ครบชุด	\N
5004	5002	ห้องดีลักซ์	เตียงคู่	35.00	5500	200	\N	fixed	ห้องพักขนาดใหญ่ เฟอร์นิเจอร์หรู มีโซนนั่งเล่น	\N
5005	5003	ห้องพัดลม	เตียงเดี่ยว	18.00	2900	100	\N	fixed	ห้องพัดลมราคาประหยัด เหมาะสำหรับนักศึกษา	\N
5006	5003	ห้องแอร์	เตียงเดี่ยว	18.00	3900	130	\N	fixed	ห้องแอร์ขนาดกะทัดรัด เฟอร์นิเจอร์พื้นฐาน	\N
5007	5004	ห้องมาตรฐาน	เตียงเดี่ยว	22.00	3800	130	\N	fixed	ห้องพักมาตรฐาน พร้อมเฟอร์นิเจอร์ครบชุด	\N
5008	5005	ห้องสแตนดาร์ด	เตียงเดี่ยว	24.00	3300	120	\N	fixed	ห้องพักสไตล์มินิมอล ตกแต่งสวย วิวสวน	\N
5009	5005	ห้องพรีเมี่ยม	เตียงคู่	30.00	4500	180	\N	fixed	ห้องพักขนาดใหญ่ ระเบียงกว้าง วิวสวน เฟอร์นิเจอร์ครบ	\N
5010	5006	ห้องมาตรฐาน	เตียงเดี่ยว	20.00	2700	100	\N	fixed	ห้องพักสำหรับนักศึกษาหญิง พร้อมเฟอร์นิเจอร์พื้นฐาน	\N
5013	5008	ห้องประหยัด	เตียงเดี่ยว	18.00	2800	100	\N	fixed	ห้องพักราคาประหยัด เฟอร์นิเจอร์พื้นฐาน	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: myuser
--

COPY public.users (id, firebase_uid, email, username, display_name, photo_url, phone_number, member_type, residence_dorm_id, created_at, updated_at) FROM stdin;
62	DaftDHT3JYNiDBZy3s5HGT6EfMY2	figooleo9@gmail.com	figooleo9543	afagsagsgsg agaghdhfdhd	https://lh3.googleusercontent.com/a/ACg8ocLnAv2N2whm5h9tWYnmUqVHaM3qymOcbjwLN924RcuicbBm6w=s96-c	\N	owner	\N	2025-07-05 08:22:57.349653	2025-07-05 08:23:46.737812
61	CTPIZ8IIQ2fLftslHlezxg4VA3a2	65011212132@msu.ac.th	65011212132720	วิริทธิ์พล ดวงดูสัน	https://lh3.googleusercontent.com/a/ACg8ocKMLoPkfLP9K90AR1x_yGVkBeE1bjrKENBnchTn4UoSSbosNQ=s96-c	2131212313	member	1001	2025-07-04 12:06:43.10031	2025-07-05 11:59:31.299034
65	NFt8rLlqMRV0SvUn5oXAqdrW8Bl2	65011212025@msu.ac.th	65011212025357	ภูตะวัน ชลสาคร	https://lh3.googleusercontent.com/a/ACg8ocLSeVKTTKINTFbuTDTOgbmK5AmwzVWxeMH9WYlCx4qwNjXnQXuW=s96-c	\N	owner	\N	2025-07-07 17:34:14.199883	2025-07-07 17:34:14.199883
64	hsTCDO3YYLQjk0sVR7WW9nSYiQm2	figooleo10@gmail.com	figooleo10594	tthyjac michel	https://lh3.googleusercontent.com/a/ACg8ocJnpnVpSOWzURVofcxR1ypIGz89dXLk72-WPZbcvG2PnNfxhQ=s96-c	\N	owner	\N	2025-07-07 09:46:37.945584	2025-07-07 19:14:00.861874
60	qGsCmRoK56fFQtAqzXue6kPndgH3	figooleo1@gmail.com	figooleo1271	Muklai Studio	https://lh3.googleusercontent.com/a/ACg8ocKohQ3vu--4v01RW2glFewUvEP0W4e_1gfzW5CcYRpr6YAIfw=s96-c	7676767676	member	1001	2025-07-04 12:01:03.524415	2025-07-07 19:23:41.329981
59	PWg3dxpvCOaJs0d4cpVFmRZcV182	figooleo5@gmail.com	figooleo5482	hggutuggg hhftyuj	https://lh3.googleusercontent.com/a/ACg8ocJr-A9dd1KPKKjQCxMS5ozTDg1HICODCPL9HdbqnaG7XmnNQg=s96-c	\N	owner	\N	2025-06-30 22:33:20.016156	2025-07-07 19:25:31.603409
63	BlbmYBBRCKU1PKgtrNlkmm2SKQv1	leejainmate@gmail.com	leejainmate79	InVisiBle CH	https://lh3.googleusercontent.com/a/ACg8ocLfUEQMDtAunhumoh-gwucXv4ObyvUv-3_VQFJYxNrrmgsaSBsq=s96-c	\N	owner	\N	2025-07-05 08:50:53.751489	2025-07-07 19:44:47.258824
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

SELECT pg_catalog.setval('public.dormitory_amenities_dorm_amenity_id_seq', 62, true);


--
-- Name: dormitory_images_image_id_seq; Type: SEQUENCE SET; Schema: public; Owner: myuser
--

SELECT pg_catalog.setval('public.dormitory_images_image_id_seq', 17, true);


--
-- Name: member_requests_request_id_seq; Type: SEQUENCE SET; Schema: public; Owner: myuser
--

SELECT pg_catalog.setval('public.member_requests_request_id_seq', 18, true);


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

SELECT pg_catalog.setval('public.users_id_seq', 65, true);


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

